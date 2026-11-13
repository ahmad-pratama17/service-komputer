-- ============================================================================
-- ServiceKomputer - Computer & IT Services
-- Migration 00005: AI Assistant customer
--
-- ai_conversations sudah ada di 00001 (satu baris per pesan) tetapi belum
-- memiliki policy delete, sehingga "hapus percakapan" tidak bisa dilakukan
-- dari sisi client. Policy di bawah ini menutup celah itu tanpa memberi akses
-- tulis ke tabel lain.
--
-- Catatan keamanan: tabel ini tetap append-only untuk AI. OpenAI tidak
-- menerima kredensial Supabase dan tidak punya tool untuk menulis ke database;
-- satu-satunya akses tulis adalah Server Action milik customer sendiri.
-- ============================================================================

drop policy if exists "Conversations: users delete own" on public.ai_conversations;

create policy "Conversations: users delete own"
  on public.ai_conversations for delete
  using (user_id = auth.uid());
