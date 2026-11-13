-- ============================================================================
-- 00011_whatsapp_notifications.sql — menulis kanal WhatsApp ke outbox.
-- ============================================================================
--
-- Yang berubah: tiga fungsi trigger di bawah tetap menulis baris 'in_app'
-- seperti sebelumnya, DITAMBAH satu baris 'whatsapp' untuk event yang
-- disepakati:
--   - order.created        -> staf (admin + teknisi)
--   - order.status_changed -> customer pemilik pesanan
--   - invoice.issued       -> customer pemilik pesanan (hanya saat terbit,
--                             bukan setiap perubahan status pembayaran,
--                             supaya tidak cerewet dan hemat biaya pesan)
--
-- Baris whatsapp berstatus 'pending' sampai diproses aplikasi lewat
-- drainPendingNotifications() (cron / tombol manual). Tanpa kredensial
-- Fonnte (WHATSAPP_TOKEN/WHATSAPP_SENDER), baris tetap pending dan tidak
-- hilang — terkirim otomatis setelah kredensial diisi.
--
-- Penerima tanpa nomor HP valid dilewati pengirim dengan pesan jelas
-- (lihat whatsapp.ts), jadi customer lama tanpa nomor telepon tidak merusak
-- antrean.
-- ============================================================================

-- 1. Pesanan baru -> staf, in_app + whatsapp -----------------------------------
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

  perform public.queue_notification(
    p.id,
    'order.created',
    'Pesanan Baru',
    'Pesanan ' || new.order_number || ' dari ' || new.device_type ||
      ' telah masuk dan perlu ditinjau.',
    'order',
    'whatsapp'
  )
  from public.profiles p
  where p.role in ('admin', 'teknisi');

  return new;
end;
$$;

-- 2. Status berubah -> customer, in_app + whatsapp --------------------------------
-- Ganti versi 00007: hanya bagian antrean yang ditambah, logika judul dan
-- kondisi dikopi persis.
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

  perform public.queue_notification(
    v_customer_id,
    'order.status_changed',
    v_title,
    v_message,
    'order',
    'whatsapp'
  );

  return new;
end;
$$;

-- 3. Invoice terbit -> customer, in_app + whatsapp ---------------------------------
-- Hanya event invoice.issued yang digandakan ke WhatsApp. Perubahan status
-- pembayaran tetap in_app saja supaya pelanggan tidak dibanjiri pesan.
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

    -- WhatsApp hanya untuk tagihan baru terbit.
    if v_event = 'invoice.issued' then
      perform public.queue_notification(
        v_customer_id, v_event, v_title, v_message, v_type, 'whatsapp'
      );
    end if;
  end if;

  return new;
end;
$$;
