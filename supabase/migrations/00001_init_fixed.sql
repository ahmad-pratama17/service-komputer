-- ============================================================================
-- ServiceKomputer — Computer & IT Services
-- Migration 00001: Initial schema (enums, tables, triggers, RLS)
--
-- Catatan desain:
--  - profiles terhubung 1:1 ke auth.users (Supabase Auth).
--  - Status order mengalir: pending -> accepted -> diagnosis ->
--    waiting_approval -> in_progress -> completed -> paid -> closed,
--    dan cancelled bisa terjadi dari beberapa state.
--  - order_status_history mencatat transisi old_status -> new_status
--    (di-generate otomatis oleh trigger saat status order berubah).
--  - ai_conversations adalah log pesan (baris per pesan) dengan order_id
--    opsional sebagai konteks percakapan untuk sebuah order.
--  - Semua tabel memakai Row Level Security. Customer hanya bisa mengakses
--    data miliknya; admin bisa mengelola semua.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('customer', 'admin');

create type public.service_category as enum (
  'computer_repair',
  'network',
  'software',
  'it_support',
  'data_recovery',
  'maintenance'
);

create type public.order_status as enum (
  'pending',
  'accepted',
  'diagnosis',
  'waiting_approval',
  'in_progress',
  'completed',
  'paid',
  'closed',
  'cancelled'
);

create type public.payment_status as enum (
  'unpaid',
  'partially_paid',
  'paid'
);

create type public.notification_type as enum (
  'order',
  'invoice',
  'payment',
  'system'
);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Role check helper yang dipakai RLS policies
-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  phone text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category public.service_category not null default 'computer_repair',
  starting_price numeric(12, 2) not null default 0,
  estimated_duration integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  device_type text not null,
  device_brand text,
  device_model text,
  problem_description text not null,
  address text,
  preferred_schedule timestamptz,
  status public.order_status not null default 'pending',
  diagnosis text,
  estimated_cost numeric(12, 2),
  final_cost numeric(12, 2),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.service_orders (id) on delete cascade,
  old_status public.order_status,
  new_status public.order_status not null,
  note text,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.service_orders (id) on delete restrict,
  invoice_number text not null unique,
  subtotal numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  payment_status public.payment_status not null default 'unpaid',
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  type public.notification_type not null default 'system',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Log pesan AI Assistant (satu baris per pesan; order_id opsional
-- menghubungkan percakapan ke sebuah order sebagai konteks).
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.service_orders (id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- Helper functions that depend on tables
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
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
      and p.role = 'admin'
  );
$$;

-- Buat baris profile otomatis saat user baru mendaftar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.email,
      ''
    ),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'customer'
  );
  return new;
end;
$$;

-- Cegah customer mengubah role/email sendiri (privilege escalation)
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Role tidak dapat diubah.';
    end if;
    if new.email is distinct from old.email then
      raise exception 'Email tidak dapat diubah.';
    end if;
  end if;
  return new;
end;
$$;

-- Catat status awal ke riwayat saat order baru dibuat
create or replace function public.create_initial_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.order_status_history (order_id, old_status, new_status, note)
  values (new.id, null, new.status, 'Pesanan diterima.');
  return new;
end;
$$;

-- Catat perubahan status order (pemicu saat UPDATE status)
create or replace function public.record_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.order_status_history (order_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

-- Beri tahu admin saat order baru masuk
create or replace function public.notify_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, message)
  select
    p.id,
    'order',
    'Pesanan Baru',
    'Order ' || new.order_number || ' telah masuk.'
  from public.profiles p
  where p.role = 'admin';
  return new;
end;
$$;

-- Beri tahu customer saat status order berubah (kecuali entri awal)
create or replace function public.notify_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  if new.old_status is null or new.old_status = new.new_status then
    return new;
  end if;

  select customer_id into v_customer_id
  from public.service_orders
  where id = new.order_id;

  if v_customer_id is not null then
    insert into public.notifications (user_id, type, title, message)
    values (
      v_customer_id,
      'order',
      'Status Pesanan Diperbarui',
      'Status pesanan Anda diperbarui menjadi: ' || new.new_status
    );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

create trigger service_orders_set_updated_at
  before update on public.service_orders
  for each row execute function public.set_updated_at();

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Business triggers
-- ---------------------------------------------------------------------------
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

create trigger service_orders_create_status_history
  after insert on public.service_orders
  for each row execute function public.create_initial_status_history();

create trigger service_orders_record_status_change
  after update of status on public.service_orders
  for each row execute function public.record_status_change();

create trigger service_orders_notify_admins
  after insert on public.service_orders
  for each row execute function public.notify_new_order();

create trigger order_status_change_notify_customer
  after insert on public.order_status_history
  for each row execute function public.notify_order_status_change();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.service_orders enable row level security;
alter table public.order_status_history enable row level security;
alter table public.invoices enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_conversations enable row level security;

-- profiles ---------------------------------------------------------------
create policy "Profiles: users view own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles: users update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Profiles: admins manage all"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- services ---------------------------------------------------------------
create policy "Services: anyone reads active"
  on public.services for select
  using (is_active = true or public.is_admin());

create policy "Services: admins insert"
  on public.services for insert
  with check (public.is_admin());

create policy "Services: admins update"
  on public.services for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Services: admins delete"
  on public.services for delete
  using (public.is_admin());

-- service_orders -----------------------------------------------------------
-- Customer hanya boleh membuat & melihat order miliknya.
-- Perubahan status/cost hanya boleh dilakukan admin (update).
create policy "Orders: customers create own"
  on public.service_orders for insert
  with check (auth.uid() = customer_id);

create policy "Orders: view own or admin"
  on public.service_orders for select
  using (auth.uid() = customer_id or public.is_admin());

create policy "Orders: admins update all"
  on public.service_orders for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Orders: admins delete"
  on public.service_orders for delete
  using (public.is_admin());

-- order_status_history -----------------------------------------------------
create policy "StatusHistory: admins insert"
  on public.order_status_history for insert
  with check (public.is_admin());

create policy "StatusHistory: view own order or admin"
  on public.order_status_history for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.service_orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
    )
  );

create policy "StatusHistory: admins update"
  on public.order_status_history for update
  using (public.is_admin())
  with check (public.is_admin());

-- invoices -----------------------------------------------------------------
-- Customer melihat invoice lewat kepemilikan order terkait.
create policy "Invoices: view own order or admin"
  on public.invoices for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.service_orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
    )
  );

create policy "Invoices: admins insert"
  on public.invoices for insert
  with check (public.is_admin());

create policy "Invoices: admins update"
  on public.invoices for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Invoices: admins delete"
  on public.invoices for delete
  using (public.is_admin());

-- notifications -------------------------------------------------------------
create policy "Notifications: view own or admin"
  on public.notifications for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Notifications: users mark own read"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and is_read = true);

create policy "Notifications: admins manage all"
  on public.notifications for all
  using (public.is_admin())
  with check (public.is_admin());

-- ai_conversations ------------------------------------------------------------
create policy "Conversations: users create own"
  on public.ai_conversations for insert
  with check (user_id = auth.uid());

create policy "Conversations: view own or admin"
  on public.ai_conversations for select
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index idx_profiles_email on public.profiles (email);
create index idx_services_category on public.services (category);
create index idx_services_active on public.services (is_active) where is_active = true;

create index idx_service_orders_customer_id on public.service_orders (customer_id);
create index idx_service_orders_service_id on public.service_orders (service_id);
create index idx_service_orders_status on public.service_orders (status);

create index idx_order_status_history_order_id on public.order_status_history (order_id);
create index idx_order_status_history_order_created on public.order_status_history (order_id, created_at);

create index idx_invoices_order_id on public.invoices (order_id);
create index idx_invoices_payment_status on public.invoices (payment_status);

create index idx_notifications_user_id on public.notifications (user_id, is_read);

create index idx_ai_conversations_user_order on public.ai_conversations (user_id, order_id);
create index idx_ai_conversations_user_created on public.ai_conversations (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Catatan fase berikutnya (belum diimplementasikan):
--  - Pembayaran akan memakai invoices.payment_status (sudah tersedia).
--  - Approval customer untuk status 'waiting_approval' akan dibuat sebagai
--    RPC `approve_my_order(order_id)` (security definer) pada fase aplikasi,
--    karena customer tidak diizinkan UPDATE service_orders langsung via RLS.
-- ---------------------------------------------------------------------------