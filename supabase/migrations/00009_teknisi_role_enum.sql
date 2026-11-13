-- ============================================================================
-- 00009_teknisi_role_enum.sql — menambah nilai 'teknisi' ke enum user_role.
-- ============================================================================
--
-- BERKAS INI WAJIB DIJALANKAN SENDIRI, sebelum 00010. Alasannya teknis
-- PostgreSQL: ALTER TYPE ... ADD VALUE tidak boleh berada di dalam blok
-- transaksi, sedangkan SQL Editor Supabase menjalankan tiap berkas sebagai
-- satu transaksi bila digabung. Jadi: jalankan berkas ini dulu (satu
-- statement), tunggu sukses, lalu jalankan 00010_teknisi_role_access.sql.
-- ============================================================================

alter type public.user_role add value 'teknisi';
