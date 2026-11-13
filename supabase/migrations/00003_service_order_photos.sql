-- ============================================================================
-- ServiceKomputer — Computer & IT Services
-- Migration 00003: Service order photos & additional notes (TAHAP 6)
--
-- Perubahan:
--  - service_orders.additional_notes: catatan tambahan dari customer.
--  - service_order_photos: metadata foto masalah/perangkat (opsional).
--  - Storage bucket privat 'service-order-photos' + RLS policies.
--
-- Konvensi path storage: {customer_id}/{order_id}/{uuid}-{nama-file}
-- sehingga policy cukup memeriksa folder pertama = auth.uid().
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Kolom tambahan
-- ---------------------------------------------------------------------------
alter table public.service_orders
  add column if not exists additional_notes text;

-- ---------------------------------------------------------------------------
-- Tabel foto order
-- ---------------------------------------------------------------------------
create table if not exists public.service_order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.service_orders (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  content_type text not null,
  size_bytes integer not null,
  created_at timestamptz not null default now()
);

alter table public.service_order_photos enable row level security;

create policy "OrderPhotos: customers insert own order"
  on public.service_order_photos for insert
  with check (
    exists (
      select 1
      from public.service_orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
    )
  );

create policy "OrderPhotos: view own order or admin"
  on public.service_order_photos for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.service_orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
    )
  );

create policy "OrderPhotos: admins delete"
  on public.service_order_photos for delete
  using (public.is_admin());

create index if not exists idx_service_order_photos_order_id
  on public.service_order_photos (order_id);

-- ---------------------------------------------------------------------------
-- Storage bucket privat + policies
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-order-photos',
  'service-order-photos',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "OrderPhotos storage: customers upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'service-order-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "OrderPhotos storage: view own or admin"
  on storage.objects for select
  using (
    bucket_id = 'service-order-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy "OrderPhotos storage: admins delete"
  on storage.objects for delete
  using (
    bucket_id = 'service-order-photos'
    and public.is_admin()
  );

create policy "OrderPhotos storage: customers delete own"
  on storage.objects for delete
  using (
    bucket_id = 'service-order-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
