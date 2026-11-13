-- ============================================================================
-- ServiceKomputer — Computer & IT Services
-- Migration 00002: Seed data (default service catalog)
-- ============================================================================

insert into public.services (name, description, category, starting_price, estimated_duration) values
  (
    'Perbaikan Komputer / Laptop',
    'Diagnosa dan perbaikan hardware komponen PC atau laptop yang rusak.',
    'computer_repair',
    150000,
    3
  ),
  (
    'Paket Instalasi Ulang Windows',
    'Instalasi ulang sistem operasi Windows beserta driver dan software dasar.',
    'software',
    100000,
    1
  ),
  (
    'Instalasi Software & Aplikasi',
    'Instalasi aplikasi, antivirus, dan konfigurasi software sesuai kebutuhan.',
    'software',
    75000,
    1
  ),
  (
    'Setup Jaringan & WiFi',
    'Instalasi dan konfigurasi jaringan, router, WiFi, serta troubleshooting koneksi.',
    'network',
    200000,
    2
  ),
  (
    'IT Support Harian',
    'Pendampingan dan dukungan IT untuk kantor maupun perorangan.',
    'it_support',
    250000,
    1
  ),
  (
    'Penyelamatan Data (Data Recovery)',
    'Pemulihan data dari hardisk/SSD yang rusak atau tidak terbaca.',
    'data_recovery',
    350000,
    5
  ),
  (
    'Perawatan & Pembersihan (Maintenance)',
    'Pembersihan fisik, penggantian thermal paste, dan optimasi performa.',
    'maintenance',
    125000,
    1
  );