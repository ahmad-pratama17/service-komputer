-- ============================================================================
-- TAHAP 12 — Notification System (in-app, outbox pattern)
--
-- 1. Tabel notification_outbox sebagai "kotak surat" tunggal. Semua trigger
--    domain (order dibuat, status berubah, biaya estimasi berubah, order
--    selesai, invoice terbit) menulis ke sini, bukan langsung ke notifications.
--
-- 2. Trigger deliver_in_app_notifications() menyalin baris channel='in_app'
--    ke tabel notifications dan menandai outbox-nya delivered. Jadi notifikasi
--    in-app tetap terkirim di transaksi yang sama dengan perubahan bisnisnya,
--    tanpa bergantung pada aplikasi Next.js.
--
-- 3. Channel selain in_app (email, whatsapp) SENGAJA TIDAK dikirim trigger,
--    karena trigger PostgreSQL tidak bisa memanggil HTTP API. Barisnya tetap
--    ditulis ke outbox dengan status 'pending' supaya aplikasi bisa mengirimnya
--    nanti lewat src/lib/notifications/dispatch.ts tanpa mengubah trigger.
--
-- 4. Notifikasi estimasi biaya (item 4 di spec TAHAP 12) sebelumnya belum ada:
--    hanya perubahan diagnosis yang memberi tahu customer.
--
-- CATATAN: fungsi notify_* di bawah sengaja menulis ke outbox. Fungsi lama di
-- 00001 dan 00004 tetap ada di database tapi tidak lagi dipakai karena
-- trigger-nya di-drop di bagian bawah migration ini.
-- ============================================================================

-- 1. Outbox --------------------------------------------------------------------
create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event text not null,
  channel text not null default 'in_app',
  title text not null,
  message text not null,
  type public.notification_type not null default 'system',
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

comment on table public.notification_outbox is
  'Antrean notifikasi lintas kanal. in_app dikirim trigger; sisanya dibaca aplikasi.';

create index if not exists idx_notification_outbox_pending
  on public.notification_outbox (channel, created_at)
  where status = 'pending';

create index if not exists idx_notification_outbox_user
  on public.notification_outbox (user_id, created_at desc);

alter table public.notification_outbox enable row level security;

-- Outbox hanya boleh dibaca admin lewat service-role client dari server.
-- Tidak ada policy untuk user: notifikasi user tetap dibaca dari tabel
-- notifications, bukan dari outbox. Update sengaja tidak diberi policy karena
-- hanya pemrosesan antrean di server yang boleh mengubah status baris.
create policy "NotificationOutbox: admins read"
  on public.notification_outbox for select
  using (public.is_admin());

-- 2. Delivery in-app ------------------------------------------------------------
create or replace function public.deliver_in_app_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.channel <> 'in_app' then
    return new;
  end if;

  insert into public.notifications (user_id, title, message, type)
  values (new.user_id, new.title, new.message, new.type);

  update public.notification_outbox
  set status = 'delivered',
      delivered_at = now()
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists notification_outbox_deliver_in_app on public.notification_outbox;

create trigger notification_outbox_deliver_in_app
  after insert on public.notification_outbox
  for each row execute function public.deliver_in_app_notification();

-- 3. Helper penulis single-sumber ----------------------------------------------
-- Semua trigger memakai helper ini supaya penulisan outbox konsisten dan
-- mudah ditambah kanalnya di satu tempat. Parameter channel sengaja wajib:
-- pemanggil tidak boleh diam-diam memakai default dan lupa menulis ke kanal
-- yang benar.
create or replace function public.queue_notification(
  p_user_id uuid,
  p_event text,
  p_title text,
  p_message text,
  p_type public.notification_type,
  p_channel text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notification_outbox
    (user_id, event, channel, title, message, type)
  values
    (p_user_id, p_event, p_channel, p_title, p_message, p_type)
  returning id into v_id;

  return v_id;
end;
$$;

-- 4. Trigger: customer membuat order -> admin ----------------------------------
-- Dipecah dari fungsi 00001 agar notifikasi juga masuk ke outbox.
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
  where p.role = 'admin';

  return new;
end;
$$;

-- 5. Trigger: status order berubah -> customer ---------------------------------
-- Perbedaan dari versi 00001: memakai label Bahasa Indonesia dan memberi tahu
-- secara terpisah ketika pesanan selesai.
create or replace function public.notify_order_status_change()
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
begin
  if new.old_status is null or new.old_status = new.new_status then
    return new;
  end if;

  select customer_id, order_number into v_customer_id, v_order_number
  from public.service_orders
  where id = new.order_id;

  if v_customer_id is null then
    return new;
  end if;

  -- Status selesai punya judul sendiri karena itu Kabar baik, bukan sekadar
  -- perubahan status teknis.
  if new.new_status = 'completed' then
    v_title := 'Service Selesai';
    v_message := 'Perbaikan untuk pesanan ' || v_order_number ||
      ' sudah selesai. Silakan cek invoice untuk pembayaran.';
  else
    v_title := 'Status Pesanan Diperbarui';
    v_message := 'Status pesanan ' || v_order_number || ' Anda kini ' ||
      lower(public.order_status_label(new.new_status)) || '.';
  end if;

  perform public.queue_notification(
    v_customer_id,
    'order.status_changed',
    v_title,
    v_message,
    'order',
    'in_app'
  );

  return new;
end;
$$;

-- 6. Trigger: invoice terbit / pembayaran berubah -> customer ------------------
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
  v_event text;
begin
  if tg_op = 'INSERT' then
    select customer_id, order_number into v_customer_id, v_order_number
    from public.service_orders
    where id = new.order_id;

    v_title := 'Invoice Diterbitkan';
    v_message := 'Invoice ' || new.invoice_number || ' untuk pesanan ' ||
      v_order_number || ' sudah tersedia. Silakan cek detail tagihan.';
    v_type := 'invoice';
    v_event := 'invoice.issued';
  elsif old.payment_status is distinct from new.payment_status then
    select customer_id, order_number into v_customer_id, v_order_number
    from public.service_orders
    where id = new.order_id;

    if new.payment_status = 'paid' then
      v_title := 'Pembayaran Diterima';
      v_message := 'Pembayaran invoice ' || new.invoice_number ||
        ' untuk pesanan ' || v_order_number ||
        ' sudah kami terima. Terima kasih.';
      v_type := 'payment';
      v_event := 'invoice.paid';
    else
      v_title := 'Status Pembayaran Diperbarui';
      v_message := 'Status pembayaran invoice ' || new.invoice_number ||
        ' untuk pesanan ' || v_order_number || ' kini ' ||
        lower(public.payment_status_label(new.payment_status)) || '.';
      v_type := 'invoice';
      v_event := 'invoice.payment_status_changed';
    end if;
  else
    return new;
  end if;

  if v_customer_id is not null then
    perform public.queue_notification(
      v_customer_id, v_event, v_title, v_message, v_type, 'in_app'
    );
  end if;

  return new;
end;
$$;

-- 7. Trigger: estimasi biaya / diagnosis berubah -> customer -------------------
-- Item 4 di spec TAHAP 12. RPC admin_update_order_details (00004) sebelumnya
-- hanya memberi tahu saat diagnosis berubah, sehingga perubahan estimasi
-- biaya tidak pernah sampai ke customer.
create or replace function public.notify_order_cost_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_order_number text;
  v_event text;
  v_title text;
  v_message text;
begin
  if coalesce(old.estimated_cost, -1) is not distinct from coalesce(new.estimated_cost, -1)
     and coalesce(old.final_cost, -1) is not distinct from coalesce(new.final_cost, -1) then
    return new;
  end if;

  select customer_id, order_number into v_customer_id, v_order_number
  from public.service_orders
  where id = new.id;

  if v_customer_id is null then
    return new;
  end if;

  -- Satu update bisa mengubah kedua angka sekaligus (mis. admin menyimpan
  -- diagnosa dan harga final bersamaan). Dua notifikasi dikirim terpisah agar
  -- item 4 dan 5 di spec tetap terpenuhi; sebelumnya kondisi ini membuat hanya
  -- biaya final yang sampai ke customer.
  if coalesce(old.estimated_cost, -1) is distinct from coalesce(new.estimated_cost, -1) then
    perform public.queue_notification(
      v_customer_id,
      'order.estimated_cost_changed',
      'Estimasi Biaya Diperbarui',
      'Estimasi biaya untuk pesanan ' || v_order_number || ' kini ' ||
        coalesce(to_char(new.estimated_cost, 'FM999,999,999'), 'belum ditentukan') ||
        '.',
      'order',
      'in_app'
    );
  end if;

  if coalesce(old.final_cost, -1) is distinct from coalesce(new.final_cost, -1) then
    perform public.queue_notification(
      v_customer_id,
      'order.final_cost_changed',
      'Biaya Final Diperbarui',
      'Biaya final untuk pesanan ' || v_order_number || ' kini ' ||
        coalesce(to_char(new.final_cost, 'FM999,999,999'), 'belum ditentukan') ||
        '. Buka detail pesanan untuk melihat rinciannya.',
      'order',
      'in_app'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists service_orders_notify_cost_change on public.service_orders;

create trigger service_orders_notify_cost_change
  after update of estimated_cost, final_cost on public.service_orders
  for each row execute function public.notify_order_cost_change();

-- 8. Triggers lama dilepas dan dipasang ulang ke fungsi terbaru ----------------
-- service_orders_notify_admins (00001) -> notify_new_order versi 00007
drop trigger if exists service_orders_notify_admins on public.service_orders;

create trigger service_orders_notify_admins
  after insert on public.service_orders
  for each row execute function public.notify_new_order();

-- order_status_change_notify_customer (00001) -> versi 00007
drop trigger if exists order_status_change_notify_customer on public.order_status_history;

create trigger order_status_change_notify_customer
  after insert on public.order_status_history
  for each row execute function public.notify_order_status_change();

-- invoices_notify_customer (00004) -> versi 00007
drop trigger if exists invoices_notify_customer on public.invoices;

create trigger invoices_notify_customer
  after insert or update of payment_status on public.invoices
  for each row execute function public.notify_invoice_change();

-- 9. Label status order -------------------------------------------------------
-- notify_order_status_change memakai order_status_label(); pastikan label
-- 'completed' terbaca enak bila fungsi ini belum ada.
create or replace function public.order_status_label(p_status public.order_status)
returns text
language sql
immutable
as $$
  select case p_status
    when 'pending' then 'Menunggu'
    when 'accepted' then 'Diterima'
    when 'diagnosis' then 'Diperiksa'
    when 'waiting_approval' then 'Menunggu Persetujuan'
    when 'in_progress' then 'Sedang Dikerjakan'
    when 'completed' then 'Selesai'
    when 'paid' then 'Lunas'
    when 'closed' then 'Ditutup'
    when 'cancelled' then 'Dibatalkan'
    else p_status::text
  end;
$$;