-- ============================================================================
-- TAHAP 13 — Security audit hardening
--
-- Migration ini tidak mengubah business logic apa pun. Semua perubahan murni
-- menutup jalur yang tidak seharusnya bisa dipakai, atau menambahkan batasan
-- yang memang sudah dimaksudkan aplikasi.
--
-- 1. queue_notification() sebelumnya bisa dipanggil langsung oleh anon maupun
--    authenticated karena fungsi SECURITY DEFINER di Postgres secara default
--    memberi EXECUTE ke PUBLIC. Anyone yang punya anon key (publik, ada di
--    bundle browser) bisa membuat notifikasi palsu atas nama user lain.
-- Semua helper ini Trigger sekarang dicabut aksesnya.
--
-- 2. Customer bisa menyisipkan service_orders dengan status/estimated_cost/
--    final_cost/diagnosis/admin_notes bebas karena policy INSERT hanya
--    mengecek customer_id. Trigger baru memaksa kolom itu ke nilai netral
--    sehingga status tetap 'pending' dan harga tetap NULL.
--
-- 3. service_order_photos bisa di-insert customer dengan photo_type='result',
--    sehingga foto palsu bisa terlihat sebagai "hasil service". Policy INSERT
--    customer sekarang dikunci ke photo_type='issue'.
--
-- 4. invoices tidak punya batasan unik per order. Dua tagihan untuk satu
--    pesanan bisa tercipta bila dua admin menekan tombol bersamaan.
--
-- 5. profiles bisa diubah 'phone' tanpa batas panjang, dan nama/phone pada
--    form profil pun belum dibatasi.
--
-- CATATAN: partly_paid sengaja tetap ada di enum (tidak bisa dihapus di
-- PostgreSQL) dan tetap dipakai di query dashboard.
-- ============================================================================

-- 1. Tutup helper notifikasi dari klien ---------------------------------------
-- Fungsi-fungsi ini hanya boleh dipanggil dari trigger. EXECUTE dicabut dari
-- public, anon, dan authenticated supaya tidak bisa dipanggil lewat PostgREST
-- RPC. Trigger tetap berjalan karena pemanggil trigger memakai hak pemilik fungsi.
revoke all on function public.queue_notification(uuid, text, text, text, public.notification_type, text) from public;
revoke all on function public.queue_notification(uuid, text, text, text, public.notification_type, text) from anon;
revoke all on function public.queue_notification(uuid, text, text, text, public.notification_type, text) from authenticated;

-- Fungsi label hanya dibaca-baca dan tidak sensitive, tapi tetap dicabut agar
-- permukaannya tidak bertambah.
revoke all on function public.order_status_label(public.order_status) from public;
revoke all on function public.payment_status_label(public.payment_status) from public;

-- 2. Customer tidak boleh menentukan status/biaya pesanan sendiri -----------
-- Nilai 'pending' dan NULL di-hardcode di sini, bukan diambil dari parameter,
-- jadi tidak ada jalur yang bisa dilewati.
create or replace function public.enforce_customer_order_defaults()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.status := 'pending';
    new.diagnosis := null;
    new.estimated_cost := null;
    new.final_cost := null;
    new.admin_notes := null;
  end if;
  return new;
end;
$$;

drop trigger if exists service_orders_enforce_customer_defaults on public.service_orders;

create trigger service_orders_enforce_customer_defaults
  before insert on public.service_orders
  for each row execute function public.enforce_customer_order_defaults();

-- 3. Foto hasil hanya boleh dibuat admin -------------------------------------
drop policy if exists "OrderPhotos: customers insert own order" on public.service_order_photos;

create policy "OrderPhotos: customers insert own order"
  on public.service_order_photos for insert
  with check (
    photo_type = 'issue'
    and exists (
      select 1
      from public.service_orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
    )
  );

-- Policy insert admin dari 00004 ikut dikunci supaya hanya dua tipe foto yang
-- sah yang bisa masuk ke tabel.
drop policy if exists "OrderPhotos: admins insert" on public.service_order_photos;

create policy "OrderPhotos: admins insert"
  on public.service_order_photos for insert
  with check (public.is_admin());

-- 4. Satu tagihan per pesanan -------------------------------------------------
-- Index unik dibuat hanya bila belum ada duplikat. Bila data lama ternyata
-- ganda, migration sengaja TIDAK menghapus tagihan (menghapus tagihan berarti
-- menghilangkan riwayat keuangan) dan hanya memberi peringatan agar cleans-up
-- dilakukan manual.
do $$
begin
  if exists (
    select 1
    from public.invoices
    group by order_id
    having count(*) > 1
  ) then
    raise warning
      'Ditemukan lebih dari satu tagihan pada order yang sama. Index unik tidak dibuat; please rapikan datanya secara manual.';
  else
    create unique index if not exists idx_invoices_order_unique
      on public.invoices (order_id);
  end if;
end;
$$;

-- 6. Outbox tidak perlu dibaca admin --------------------------------------------
-- Policy select di 00007 mengizinkan admin membaca seluruh antrean outbox lewat
-- anon key, termasuk payload email/WhatsApp milik user lain. Policy itu tidak
-- pernah dipakai: pencarian di src/ tidak menemukan satu pun pembaca
-- notification_outbox (hanya tipe di src/types/database.ts). Pemrosesan antrean
-- memakai service-role client, yang melewati RLS sama sekali, jadi menghapus
-- policy ini tidak memutus apa pun. Row-level security tetap aktif sehingga
-- anon dan authenticated langsung dari PostgREST tidak bisa membaca.
drop policy if exists "NotificationOutbox: admins read" on public.notification_outbox;

-- 5. Batas panjang input yang besar -------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_name_length;

alter table public.profiles
  add constraint profiles_name_length
  check (length(name) <= 120);

alter table public.profiles
  drop constraint if exists profiles_phone_length;

alter table public.profiles
  add constraint profiles_phone_length
  check (phone is null or length(phone) <= 32);