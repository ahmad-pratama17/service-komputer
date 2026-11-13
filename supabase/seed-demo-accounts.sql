-- ============================================================================
-- Akun demo untuk pengujian lokal — versi SQL
--
-- File ini adalah ALTERNATIF dari `npm run seed:demo`. Bedanya:
--   - Script npm  : memakai Supabase Admin API (butuh SUPABASE_SERVICE_ROLE_KEY)
--   - File ini    : SQL murni, tidak butuh service-role key sama sekali
--
-- Jalankan file ini DI SQL Editor Supabase, SETELAH 00001-00008 diterapkan.
-- Jalankan script npm HANYA kalau Anda juga sudah mengisi service-role key.
-- Jangan jalankan keduanya, atau akunnya bentrok.
--
-- Password demo ini bersifat publik dan diketahui orang lain. Project ini harus
-- khusus untuk demo/pembelajaran. JANGAN pakai pada production.
--
-- CATATAN PENTING SOAL VERSI SUPABASE
-- ---------------------------------
-- Bagian yang menyentuh auth.users dan auth.identities mengikuti skema internal
-- GoTrue. Skema itu berubah antar versi Supabase. Kalau langkah 1 gagal dengan
-- pesan "column ... does not exist", kemungkinan besar project Anda memakai
-- versi yang lebih baru/lama dari yang diasumsikan file ini.
--
-- Dua jalan keluar, cukup pilih salah satu:
--
--   (a) Pakai `npm run seed:demo` saja. Script itu memakai Admin API resmi
--       Supabase, jadi tidak bergantung pada skema internal sama sekali dan
--       tidak perlu Anda adaptasi. Ini opsi paling aman.
--
--   (b) Perbaiki sendiri sesuai error. Cara cepat melihat nama kolom yang benar:
--
--       select column_name, data_type
--       from information_schema.columns
--       where table_schema = 'auth' and table_name = 'users'
--       order by ordinal_position;
--
--       Lalu samakan daftar kolom di bagian 1 dan 2 di bawah.
--
-- Untuk pengujian normal, Anda tidak perlu repot-repot: pakai opsi (a).
-- ============================================================================

-- Akun demo dibersihkan lebih dulu agar file ini bisa dijalankan berulang.
-- Urutan penghapusan mengikuti foreign key dari auth.users.
delete from auth.identities where user_id in (
  select id from auth.users where email in (
    'admin@demo.test',
    'customer@demo.test',
    'customer2@demo.test',
    'teknisi@demo.test'
  )
);

delete from auth.users where email in (
  'admin@demo.test',
  'customer@demo.test',
  'customer2@demo.test',
  'teknisi@demo.test'
);

-- ---------------------------------------------------------------------------
-- 1. Buat user di auth.users
--
-- `crypt(password, gen_salt('bf'))` menghasilkan hash bcrypt format yang
-- dibaca Supabase Auth. Kolom `encrypted_password` TIDAK pernah berisi teks
-- polos, dan account_summary/json tidak disentuh karena trigger
-- on_auth_user_created otomatis membuat baris di public.profiles.
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'admin@demo.test',
    crypt('Demo#Admin123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Budi Santoso","phone":"628123450001"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'customer@demo.test',
    crypt('Demo#Customer123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Siti Rahayu","phone":"628123450002"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'customer2@demo.test',
    crypt('Demo#Customer123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Andi Wijaya","phone":"628123450003"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'teknisi@demo.test',
    crypt('Demo#Teknisi123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Dedi Kurniawan","phone":"628123450004"}'::jsonb,
    now(),
    now()
  );

-- ---------------------------------------------------------------------------
-- 2. Baris auth.identities
--
-- GoTrue menomori user berdasarkan tabel ini, bukan auth.users. Login dengan
-- email/password akan gagal dengan "Invalid login credentials" kalau bagian
-- ini dilewatkan, walaupun email dan password-nya benar.
-- ---------------------------------------------------------------------------

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@demo.test","phone":"","email_verified":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"customer@demo.test","phone":"","email_verified":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"customer2@demo.test","phone":"","email_verified":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    '{"sub":"44444444-4444-4444-4444-444444444444","email":"teknisi@demo.test","phone":"","email_verified":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  );

-- ---------------------------------------------------------------------------
-- 3. Naikkan role admin
--
-- Registrasi biasa selalu menghasilkan role 'customer' (lihat
-- handle_new_user di 00001_init.sql). Promo ini harus lewat SQL karena
-- trigger prevent_profile_privilege_escalation menolak perubahan role oleh
-- non-admin.
-- ---------------------------------------------------------------------------

update public.profiles
set role = 'admin',
    name = 'Budi Santoso',
    phone = '628123450001'
where id = '11111111-1111-1111-1111-111111111111';

update public.profiles
set name = 'Siti Rahayu',
    phone = '628123450002'
where id = '22222222-2222-2222-2222-222222222222';

update public.profiles
set name = 'Andi Wijaya',
    phone = '628123450003'
where id = '33333333-3333-3333-3333-333333333333';

-- Peran teknisi: area /teknisi, boleh kerja pesanan, tagihan & master
-- lihat-saja. Memerlukan migration 00009 (nilai enum 'teknisi').
update public.profiles
set role = 'teknisi',
    name = 'Dedi Kurniawan',
    phone = '628123450004'
where id = '44444444-4444-4444-4444-444444444444';

-- ---------------------------------------------------------------------------
-- 4. Data pesanan contoh
--
-- Menulis langsung ke service_orders dengan status yang sudah varied supaya
-- setiap bagian dashboard terisi: pesanan baru masuk (pending), menunggu
-- persetujuan customer (waiting_approval), selesai (completed), dan lunas
-- (paid). Dua tagihan dilampirkan supaya modul invoice terisi.
-- ---------------------------------------------------------------------------

-- Nomor pesanan sengaja dibuat unik per hari agar tidak bentrok dengan
-- constraint unique pada kolom order_number.
insert into public.service_orders (
  order_number,
  customer_id,
  service_id,
  device_type,
  device_brand,
  device_model,
  problem_description,
  address,
  status,
  diagnosis,
  estimated_cost,
  final_cost,
  admin_notes,
  created_at
)
select
  'SRV-' || to_char(now(), 'YYYYMMDD') || '-0001',
  '22222222-2222-2222-2222-222222222222',
  (select id from public.services where name ilike '%Perbaikan%' limit 1),
  'Laptop',
  'ASUS',
  'VivoBook 14',
  'Perangkat sangat lambat saat menyalakan, sering freeze dan harus di-restart beberapa kali.',
  'Jl. Contoh No. 10, Jakarta Selatan',
  'pending',
  null,
  null,
  null,
  null,
  now()
where exists (select 1 from public.services where name ilike '%Perbaikan%');

insert into public.service_orders (
  order_number,
  customer_id,
  service_id,
  device_type,
  device_brand,
  device_model,
  problem_description,
  status,
  diagnosis,
  estimated_cost,
  final_cost,
  admin_notes,
  created_at
)
select
  'SRV-' || to_char(now() - interval '6 day', 'YYYYMMDD') || '-0002',
  '22222222-2222-2222-2222-222222222222',
  (select id from public.services where name ilike '%Windows%' limit 1),
  'Laptop',
  'Lenovo',
  'ThinkPad E14',
  'Sistem lambat dan sering error blue screen saat dipakai kerja.',
  'paid',
  'SSD terfragmentasi dan Windows perlu reinstallasi.',
  450000,
  425000,
  'Pelanggan minta dikabari kalau selesai.',
  now() - interval '6 day'
where exists (select 1 from public.services where name ilike '%Windows%');

insert into public.service_orders (
  order_number,
  customer_id,
  service_id,
  device_type,
  device_brand,
  device_model,
  problem_description,
  status,
  diagnosis,
  estimated_cost,
  created_at
)
select
  'SRV-' || to_char(now() - interval '2 day', 'YYYYMMDD') || '-0003',
  '22222222-2222-2222-2222-222222222222',
  (select id from public.services where name ilike '%Jaringan%' or name ilike '%WiFi%' limit 1),
  'Router',
  'TP-Link',
  'Archer C6',
  'WiFi sering putus-nyambung di lantai dua, terutama malam hari.',
  'waiting_approval',
  'Kemungkinan komponen WiFi dropout, perlu ganti antena.',
  275000,
  now() - interval '2 day';

-- Pesanan customer kedua: selesai, tagihan sudah terbit tapi belum dibayar.
insert into public.service_orders (
  order_number,
  customer_id,
  service_id,
  device_type,
  device_brand,
  device_model,
  problem_description,
  status,
  diagnosis,
  estimated_cost,
  final_cost,
  created_at
)
select
  'SRV-' || to_char(now() - interval '1 day', 'YYYYMMDD') || '-0004',
  '33333333-3333-3333-3333-333333333333',
  (select id from public.services where name ilike '%Perbaikan%' limit 1),
  'PC Desktop',
  'Asus',
  'Xavier',
  'PC sering mati sendiri saat sedang digunakan, suspected overheat pada CPU.',
  'completed',
  'Thermal paste kering dan kipas CPU dusty. Sudah dibersihkan.',
  350000,
  325000,
  now() - interval '1 day'
where exists (select 1 from public.services where name ilike '%Perbaikan%');

-- Tagihan untuk pesanan lunas.
insert into public.invoices (
  order_id,
  invoice_number,
  description,
  subtotal,
  total,
  payment_status,
  issued_at,
  paid_at
)
select
  id,
  'INV-' || to_char(now(), 'YYYY') || '-0001',
  'Perbaikan laptop dan reinstalasi sistem operasi.',
  425000,
  425000,
  'paid',
  created_at,
  created_at + interval '1 day'
from public.service_orders
where order_number = 'SRV-' || to_char(now() - interval '6 day', 'YYYYMMDD') || '-0002';

-- Tagihan untuk pesanan selesai yang belum dibayar.
insert into public.invoices (
  order_id,
  invoice_number,
  description,
  subtotal,
  total,
  payment_status,
  issued_at,
  due_at
)
select
  id,
  'INV-' || to_char(now(), 'YYYY') || '-0002',
  'Perbaikan PC desktop dan pembersihan komponen.',
  325000,
  325000,
  'unpaid',
  created_at,
  created_at + interval '7 day'
from public.service_orders
where order_number = 'SRV-' || to_char(now() - interval '1 day', 'YYYYMMDD') || '-0004';

-- ---------------------------------------------------------------------------
-- 5. Verifikasi
--
-- Jalankan query di bawah. Hasil yang diharapkan:
--   accounts  = 4
--   admins    = 1
--   teknisi   = 1
--   orders    = 4
--   invoices  = 2
-- ---------------------------------------------------------------------------

select
  (select count(*) from auth.users
     where email in ('admin@demo.test','customer@demo.test','customer2@demo.test','teknisi@demo.test'))
    as accounts,
  (select count(*) from public.profiles where role = 'admin') as admins,
  (select count(*) from public.profiles where role = 'teknisi') as teknisi,
  (select count(*) from public.service_orders) as orders,
  (select count(*) from public.invoices) as invoices;
