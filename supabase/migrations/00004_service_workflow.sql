-- ============================================================================
-- ServiceKomputer - Computer & IT Services
-- Migration 00004: Service management workflow (TAHAP 8)
--
-- Alur status (sumber kebenaran ada di database):
--   pending -> accepted -> diagnosis -> waiting_approval -> in_progress
--           -> completed -> paid -> closed
--   cancelled dapat terjadi dari pending, accepted, diagnosis,
--   waiting_approval, atau in_progress.
--   closed dan cancelled bersifat terminal.
--
-- Isi migration:
--  1. order_photo_type enum + service_order_photos.photo_type
--     ('issue' = foto dari customer, 'result' = foto hasil service dari admin).
--  2. order_status_label() / payment_status_label(): label Bahasa Indonesia.
--  3. validate_order_status_transition(): trigger BEFORE UPDATE OF status yang
--     menolak transisi tidak valid, mis. pending -> paid (errcode 23514).
--  4. record_status_change(): membaca note opsional dari session setting
--     'app.status_note' (di-set transaction-local oleh RPC), tetap mengisi
--     changed_by = auth.uid().
--  5. notify_order_status_change(): notifikasi customer memakai nomor pesanan
--     dan label Bahasa Indonesia.
--  6. notify_invoice_change(): notifikasi customer saat invoice terbit atau
--     status pembayaran berubah.
--  7. RPC admin_update_order_status(): update status + riwayat + notifikasi +
--     changed_by dalam satu transaksi, dengan pengecekan role di database.
--  8. RPC admin_update_order_details(): diagnosis, estimated cost, final cost,
--     admin notes, dengan validasi biaya non-negatif di database.
--  9. RPC approve_my_order(): persetujuan customer advancing
--     waiting_approval -> in_progress (sejalan dengan catatan desain di 00001).
-- 10. RLS: admin boleh insert metadata foto dan upload ke bucket storage.
--
-- Catatan: tabel invoices tidak menyimpan nominal yang sudah dibayar, jadi
-- notifikasi pembayaran sebagian tidak menampilkan sisa tagihan.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tipe & kolom foto hasil service
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.order_photo_type as enum ('issue', 'result');
exception
  when duplicate_object then null;
end;
$$;

alter table public.service_order_photos
  add column if not exists photo_type public.order_photo_type not null default 'issue';

create index if not exists idx_service_order_photos_order_type
  on public.service_order_photos (order_id, photo_type);

-- ---------------------------------------------------------------------------
-- 2. Label Bahasa Indonesia (satu definisi per fungsi)
-- ---------------------------------------------------------------------------
create or replace function public.order_status_label(p_status public.order_status)
returns text
language sql
immutable
as $$
  select case p_status
    when 'pending' then 'Menunggu Diterima'
    when 'accepted' then 'Diterima'
    when 'diagnosis' then 'Diagnosa'
    when 'waiting_approval' then 'Menunggu Persetujuan'
    when 'in_progress' then 'Dalam Pengerjaan'
    when 'completed' then 'Selesai'
    when 'paid' then 'Dibayar'
    when 'closed' then 'Ditutup'
    when 'cancelled' then 'Dibatalkan'
    else p_status::text
  end;
$$;

create or replace function public.payment_status_label(p_status public.payment_status)
returns text
language sql
immutable
as $$
  select case p_status
    when 'unpaid' then 'Belum Dibayar'
    when 'partially_paid' then 'Dibayar Sebagian'
    when 'paid' then 'Lunas'
    else p_status::text
  end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Validasi transisi status
-- ---------------------------------------------------------------------------
create or replace function public.validate_order_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_allowed boolean := false;
begin
  -- Status tidak berubah: tidak ada yang divalidasi.
  if old.status is not distinct from new.status then
    return new;
  end if;

  v_allowed := case old.status
    when 'pending' then new.status in ('accepted', 'cancelled')
    when 'accepted' then new.status in ('diagnosis', 'cancelled')
    when 'diagnosis' then new.status in ('waiting_approval', 'cancelled')
    when 'waiting_approval' then new.status in ('in_progress', 'cancelled')
    when 'in_progress' then new.status in ('completed', 'cancelled')
    when 'completed' then new.status = 'paid'
    when 'paid' then new.status = 'closed'
    else false
  end;

  if not v_allowed then
    raise exception 'Transisi status tidak valid: % -> %',
      public.order_status_label(old.status),
      public.order_status_label(new.status)
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists service_orders_validate_status_transition on public.service_orders;

create trigger service_orders_validate_status_transition
  before update of status on public.service_orders
  for each row execute function public.validate_order_status_transition();

-- ---------------------------------------------------------------------------
-- 4. Riwayat status: dukung note opsional dari RPC
-- ---------------------------------------------------------------------------
create or replace function public.record_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note text;
begin
  if old.status is distinct from new.status then
    v_note := nullif(btrim(coalesce(current_setting('app.status_note', true), '')), '');

    insert into public.order_status_history (order_id, old_status, new_status, note, changed_by)
    values (new.id, old.status, new.status, v_note, auth.uid());
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Notifikasi customer saat status berubah
-- ---------------------------------------------------------------------------
create or replace function public.notify_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_order_number text;
begin
  -- Entri awal (old_status null) tidak perlu notifikasi.
  if new.old_status is null or new.old_status = new.new_status then
    return new;
  end if;

  select customer_id, order_number into v_customer_id, v_order_number
  from public.service_orders
  where id = new.order_id;

  if v_customer_id is not null then
    insert into public.notifications (user_id, title, message, type)
    values (
      v_customer_id,
      'Status Pesanan Diperbarui',
      'Pesanan ' || v_order_number || ' kini berstatus ' ||
        public.order_status_label(new.new_status) ||
        '. Buka detail pesanan untuk melihat perkembangannya.',
      'order'
    );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Notifikasi customer saat invoice terbit / pembayaran berubah
-- ---------------------------------------------------------------------------
create or replace function public.notify_invoice_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_order_number text;
  v_title text;
  v_message text;
  v_type public.notification_type;
begin
  if tg_op = 'INSERT' then
    select customer_id, order_number into v_customer_id, v_order_number
    from public.service_orders
    where id = new.order_id;

    v_title := 'Invoice Diterbitkan';
    v_message := 'Invoice ' || new.invoice_number || ' untuk pesanan ' ||
      v_order_number || ' sudah tersedia. Silakan cek detail tagihan.';
    v_type := 'invoice';
  elsif old.payment_status is distinct from new.payment_status then
    select customer_id, order_number into v_customer_id, v_order_number
    from public.service_orders
    where id = new.order_id;

    if new.payment_status = 'paid' then
      v_title := 'Pembayaran Diterima';
      v_message := 'Pembayaran invoice ' || new.invoice_number || ' untuk pesanan ' ||
        v_order_number || ' sudah kami terima. Terima kasih.';
      v_type := 'payment';
    else
      v_title := 'Status Pembayaran Diperbarui';
      v_message := 'Status pembayaran invoice ' || new.invoice_number ||
        ' untuk pesanan ' || v_order_number || ' kini ' ||
        lower(public.payment_status_label(new.payment_status)) || '.';
      v_type := 'invoice';
    end if;
  else
    return new;
  end if;

  if v_customer_id is not null then
    insert into public.notifications (user_id, title, message, type)
    values (v_customer_id, v_title, v_message, v_type);
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_notify_customer on public.invoices;

create trigger invoices_notify_customer
  after insert or update of payment_status on public.invoices
  for each row execute function public.notify_invoice_change();

-- ---------------------------------------------------------------------------
-- 7. RPC: update status order (atomic + otorisasi di database)
-- ---------------------------------------------------------------------------
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

  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat mengubah status pesanan.'
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

-- ---------------------------------------------------------------------------
-- 8. RPC: update detail operasional order
-- ---------------------------------------------------------------------------
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

  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat mengubah detail pesanan.'
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

-- ---------------------------------------------------------------------------
-- 9. RPC: persetujuan customer (waiting_approval -> in_progress)
-- ---------------------------------------------------------------------------
create or replace function public.approve_my_order(p_order_id uuid)
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

  perform set_config('app.status_note', 'Persetujuan customer atas hasil diagnosa.', true);

  update public.service_orders
  set status = 'in_progress'
  where id = p_order_id
    and customer_id = auth.uid()
    and status = 'waiting_approval'
  returning * into v_row;

  perform set_config('app.status_note', '', true);

  if v_row.id is null then
    raise exception 'Pesanan tidak tersedia untuk disetujui.'
      using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Hak akses RPC
-- ---------------------------------------------------------------------------
revoke all on function public.admin_update_order_status(uuid, public.order_status, text) from public;
grant execute on function public.admin_update_order_status(uuid, public.order_status, text) to authenticated;

revoke all on function public.admin_update_order_details(uuid, text, numeric, numeric, text) from public;
grant execute on function public.admin_update_order_details(uuid, text, numeric, numeric, text) to authenticated;

revoke all on function public.approve_my_order(uuid) from public;
grant execute on function public.approve_my_order(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 11. RLS tambahan untuk admin
-- ---------------------------------------------------------------------------
drop policy if exists "OrderPhotos: admins insert" on public.service_order_photos;

create policy "OrderPhotos: admins insert"
  on public.service_order_photos for insert
  with check (public.is_admin());

drop policy if exists "OrderPhotos storage: admins upload" on storage.objects;

create policy "OrderPhotos storage: admins upload"
  on storage.objects for insert
  with check (
    bucket_id = 'service-order-photos'
    and public.is_admin()
  );
