-- ============================================================================
-- TAHAP 11 — Invoice & Payment (MVP tanpa payment gateway)
--
-- 1. Enum payment_status tambah 'pending' = "sudah transfer, menunggu
--    verifikasi admin". Nilai 'partially_paid' sengaja DIPERTAHANKAN supaya
--    migration ini non-destruktif (PostgreSQL tidak bisa menghapus nilai
--    enum). partly_paid tidak dipakai lagi di UI MVP karena tidak ada
--    pelacakan pembayaran parsial.
--
-- 2. Kolom invoices untuk MVP + kesiapan integrasi Midtrans/Xendit:
--    description      -> uraian pekerjaan yang ditagihkan (ditulis admin)
--    payment_method   -> 'manual' sekarang; 'midtrans'/'xendit' nanti
--    payment_channel  -> kanal dari gateway (qris, bca_va, ...)
--    payment_reference-> id transaksi/snap dari gateway
--    due_at           -> batas pembayaran customer
--
-- 3. Validasi nominal di database (0 <= subtotal <= total <= 1 miliar).
--
-- 4. payment_reference unik per invoice agar webhook ganda dari gateway
--    tidak menandai pembayaran dua kali.
--
-- CATATAN PENTING: nilai enum baru tidak boleh dipakai di DEFAULT atau
-- INSERT pada transaksi yang sama dengan ADD VALUE (Postgres error 55P04:
-- "unsafe use of new value"). Karena itu 'pending' di sini hanya ditambahkan
-- ke type; fungsi label di bawah membandingkan sebagai TEXT
-- (p_status::text), bukan sebagai enum, supaya pembuatannya tidak memicu
-- pemeriksaan enum dan seluruh file tetap bisa jalan dalam satu transaksi.
-- ============================================================================

-- 1. Status baru ----------------------------------------------------------------
-- memakai IF NOT EXISTS supaya migration aman dijalankan ulang.
alter type public.payment_status add value if not exists 'pending' before 'paid';

-- 2. Kolom baru ----------------------------------------------------------------
alter table public.invoices
  add column if not exists description text not null default '',
  add column if not exists payment_method text not null default 'manual',
  add column if not exists payment_channel text,
  add column if not exists payment_reference text,
  add column if not exists due_at timestamptz;

comment on column public.invoices.description is
  'Uraian pekerjaan yang ditagihkan, ditulis admin.';
comment on column public.invoices.payment_method is
  'manual | midtrans | xendit. MVP hanya memakai manual.';
comment on column public.invoices.payment_channel is
  'Kanal pembayaran dari gateway, mis. qris atau bca_va.';
comment on column public.invoices.payment_reference is
  'Referensi transaksi dari gateway; unik untuk mencegah webhook ganda.';
comment on column public.invoices.due_at is
  'Batas pembayaran. Null berarti tidak ada tenggat.';

-- Backfill agar baris lama punya deskripsi yang bisa ditampilkan.
update public.invoices
set description = 'Tagihan layanan service'
where description = '';

-- payment_method tidak boleh kosong supaya nilai gateway nanti tidak ambigu.
alter table public.invoices
  drop constraint if exists invoices_payment_method_not_blank;

alter table public.invoices
  add constraint invoices_payment_method_not_blank
  check (length(btrim(payment_method)) > 0);

-- 3. Validasi nominal ----------------------------------------------------------
alter table public.invoices
  drop constraint if exists invoices_amounts_valid;

alter table public.invoices
  add constraint invoices_amounts_valid
  check (subtotal >= 0 and total >= subtotal and total <= 1000000000);

-- 4. Referensi pembayaran unik + indeks tenggat -------------------------------
create unique index if not exists idx_invoices_payment_reference
  on public.invoices (payment_reference)
  where payment_reference is not null;

-- Hanya invoice yang belum lunas yang butuh dicari lewat tenggat.
create index if not exists idx_invoices_due_at
  on public.invoices (due_at)
  where payment_status <> 'paid';

-- Label Bahasa Indonesia ikut diperbarui supaya notifikasi status
-- (notify_invoice_change di 00004) tidak jatuh ke cabang else.
-- Perbandingan memakai p_status::text agar pembuatan fungsi ini tidak
-- menyentuh nilai enum 'pending' yang belum di-commit (lihat catatan di atas).
create or replace function public.payment_status_label(p_status public.payment_status)
returns text
language sql
immutable
as $$
  select case p_status::text
    when 'unpaid' then 'Belum Dibayar'
    when 'pending' then 'Menunggu Verifikasi'
    when 'partially_paid' then 'Dibayar Sebagian'
    when 'paid' then 'Lunas'
    else p_status::text
  end;
$$;