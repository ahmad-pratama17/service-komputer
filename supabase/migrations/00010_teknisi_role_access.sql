-- ============================================================================
-- 00010_teknisi_role_access.sql — hak akses peran teknisi.
-- ============================================================================
--
-- Prasyarat: 00009_teknisi_role_enum.sql sudah dijalankan (nilai 'teknisi'
-- ada di enum user_role).
--
-- Pembagian peran yang ditegakkan berkas ini:
--   - admin   : semua akses, tidak berubah (is_admin() tetap admin saja).
--   - teknisi : membaca seluruh data operasional (pesanan, tagihan, layanan,
--               profil pelanggan, riwayat status, foto), mengubah STATUS dan
--               DIAGNOSIS pesanan lewat RPC, mengunggah/menghapus FOTO HASIL,
--               memakai AI Copilot, menerima notifikasi pesanan baru.
--   - teknisi TIDAK BOLEH: membuat/mengubah tagihan, mengubah katalog layanan,
--               mengubah biaya (estimated/final cost), dan menghapus foto
--               milik pelanggan. Penegakan tulis-menulis biaya dan tagihan ada
--               di lapisan aplikasi (server action); RLS di sini hanya membuka
--               baca + tulis operasional yang dibutuhkan teknisi.
-- ============================================================================

-- 1. Helper staf: admin ATAU teknisi ------------------------------------------
-- is_admin() TIDAK diubah supaya semua gerbang khusus admin (keuangan,
-- master, hapus) tetap admin saja tanpa audit ulang.
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'teknisi')
  );
$$;

-- 2. profiles: staf boleh MEMBACA semua profil ---------------------------------
-- Teknisi butuh nama/email/telepon pelanggan pada detail pesanan. Tulis tetap
-- lewat policy lama (milik sendiri + admin kelola semua); trigger anti-eskalasi
-- tetap memblokir non-admin yang mencoba mengubah role/email.
create policy "Profiles: staff read all"
  on public.profiles for select
  using (public.is_staff());

-- 3. services: staf membaca semua (termasuk nonaktif) --------------------------
drop policy if exists "Services: anyone reads active" on public.services;

create policy "Services: anyone reads active"
  on public.services for select
  using (is_active = true or public.is_staff());

-- 4. service_orders: staf membaca semua pesanan --------------------------------
drop policy if exists "Orders: view own or admin" on public.service_orders;

create policy "Orders: view own or staff"
  on public.service_orders for select
  using (
    auth.uid() = customer_id
    or public.is_staff()
  );

-- 5. order_status_history: staf membaca riwayat ---------------------------------
drop policy if exists "StatusHistory: view own order or admin"
  on public.order_status_history;

create policy "StatusHistory: view own order or staff"
  on public.order_status_history for select
  using (
    public.is_staff()
    or exists (
      select 1
      from public.service_orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
    )
  );

-- 6. invoices: staf MEMBACA semua tagihan ---------------------------------------
-- Membuat/mengubah/menghapus tagihan tetap admin saja (lihat bawah: tidak
-- ada policy staff untuk insert/update/delete invoices, dan server action
-- menolak peran teknisi).
drop policy if exists "Invoices: view own order or admin" on public.invoices;

create policy "Invoices: view own order or staff"
  on public.invoices for select
  using (
    public.is_staff()
    or exists (
      select 1
      from public.service_orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
    )
  );

-- 7. Foto pesanan: staf membaca semua + mengelola FOTO HASIL --------------------
drop policy if exists "OrderPhotos: view own order or admin"
  on public.service_order_photos;

create policy "OrderPhotos: view own order or staff"
  on public.service_order_photos for select
  using (
    public.is_staff()
    or exists (
      select 1
      from public.service_orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
    )
  );

-- Insert admin (00004/00008) diganti insert staf: teknisi mengunggah foto hasil.
-- Batasan tipe foto customer (hanya 'issue', dari 00008) tidak tersentuh.
drop policy if exists "OrderPhotos: admins insert"
  on public.service_order_photos;

create policy "OrderPhotos: staff insert"
  on public.service_order_photos for insert
  with check (public.is_staff());

-- Teknisi boleh menghapus FOTO HASIL (koreksi unggahan kerja). Foto milik
-- pelanggan (issue) dan policy hapus admin tidak berubah.
create policy "OrderPhotos: staff delete results"
  on public.service_order_photos for delete
  using (public.is_staff() and photo_type = 'result');

-- 8. Storage bucket: staf mengunggah/melihat/menghapus foto kerja ----------------
drop policy if exists "OrderPhotos storage: admins upload" on storage.objects;

create policy "OrderPhotos storage: staff upload"
  on storage.objects for insert
  with check (
    bucket_id = 'service-order-photos'
    and public.is_staff()
  );

drop policy if exists "OrderPhotos storage: view own or admin"
  on storage.objects;

create policy "OrderPhotos storage: view own or staff"
  on storage.objects for select
  using (
    bucket_id = 'service-order-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_staff()
    )
  );

drop policy if exists "OrderPhotos storage: admins delete" on storage.objects;

create policy "OrderPhotos storage: staff delete"
  on storage.objects for delete
  using (
    bucket_id = 'service-order-photos'
    and public.is_staff()
  );

-- 9. Notifikasi pesanan baru juga masuk ke teknisi --------------------------------
-- Versi aktif fungsi ini dari 00007 (menggantikan versi 00001).
create or replace function public.notify_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.queue_notification(
    p.id,
    'order.created',
    'Pesanan Baru',
    'Pesanan ' || new.order_number || ' dari ' || new.device_type ||
      ' telah masuk dan perlu ditinjau.',
    'order',
    'in_app'
  )
  from public.profiles p
  where p.role in ('admin', 'teknisi');

  return new;
end;
$$;

-- 10. RPC operasional: staf boleh, admin saja tidak lagi --------------------------
-- Grant EXECUTE ke authenticated sudah ada dari 00004, tidak perlu diubah.
-- Pembatasan field biaya untuk teknisi ditegakkan di server action aplikasi
-- (updateOrderDetailsAction mengabaikan biaya bila pemanggil teknisi),
-- sehingga RPC ini tetap satu pintu untuk kedua peran staf.
create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_note text default null
)
returns public.service_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.service_orders;
begin
  if auth.uid() is null then
    raise exception 'Sesi tidak terautentikasi.' using errcode = '42501';
  end if;

  if not public.is_staff() then
    raise exception 'Hanya admin atau teknisi yang dapat mengubah status pesanan.'
      using errcode = '42501';
  end if;

  -- Transaction-local: hanya berlaku untuk pemanggilan RPC ini, sehingga
  -- trigger AFTER UPDATE membacanya untuk mengisi kolom note.
  perform set_config('app.status_note', coalesce(p_note, ''), true);

  update public.service_orders
  set status = p_status
  where id = p_order_id
  returning * into v_row;

  perform set_config('app.status_note', '', true);

  if v_row.id is null then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

create or replace function public.admin_update_order_details(
  p_order_id uuid,
  p_diagnosis text default null,
  p_estimated_cost numeric default null,
  p_final_cost numeric default null,
  p_admin_notes text default null
)
returns public.service_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.service_orders;
  v_old_diagnosis text;
  v_customer_id uuid;
  v_order_number text;
begin
  if auth.uid() is null then
    raise exception 'Sesi tidak terautentikasi.' using errcode = '42501';
  end if;

  if not public.is_staff() then
    raise exception 'Hanya admin atau teknisi yang dapat mengubah detail pesanan.'
      using errcode = '42501';
  end if;

  if p_estimated_cost is not null and p_estimated_cost < 0 then
    raise exception 'Estimated cost tidak boleh negatif.' using errcode = '22003';
  end if;

  if p_final_cost is not null and p_final_cost < 0 then
    raise exception 'Final cost tidak boleh negatif.' using errcode = '22003';
  end if;

  select diagnosis, customer_id, order_number
  into v_old_diagnosis, v_customer_id, v_order_number
  from public.service_orders
  where id = p_order_id;

  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'P0002';
  end if;

  update public.service_orders
  set diagnosis = nullif(btrim(coalesce(p_diagnosis, '')), ''),
      estimated_cost = p_estimated_cost,
      final_cost = p_final_cost,
      admin_notes = nullif(btrim(coalesce(p_admin_notes, '')), '')
  where id = p_order_id
  returning * into v_row;

  if coalesce(v_old_diagnosis, '') is distinct from coalesce(v_row.diagnosis, '') then
    insert into public.notifications (user_id, title, message, type)
    values (
      v_customer_id,
      'Diagnosis Pesanan Tersedia',
      'Diagnosis untuk pesanan ' || v_order_number ||
        ' sudah diperbarui oleh teknisi. Buka detail pesanan untuk membacanya.',
      'order'
    );
  end if;

  return v_row;
end;
$$;
