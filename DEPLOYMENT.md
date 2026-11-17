# Deployment Guide — Service Komputer

Panduan lengkap untuk men-deploy aplikasi Service Komputer ke production dengan aman, murah, dan mudah.

## Pilihan Platform Deployment

| Platform | Biaya | Kelebihan | Kekurangan | Disarankan |
|----------|-------|-----------|------------|------------|
| **Vercel** | Gratis (Hobby) | Otomatis CI/CD, HTTPS gratis, edge network, mudah | Serverless function limit, tidak ideal untuk cron job | ✅ **Pertama** |
| **Docker / VPS** | ~$5-10/bulan | Kontrol penuh, cron job bebas, biaya terendah | Manajemen server manual, SSL sendiri | Kedua |
| **Railway / Render** | Gratis tier terbatas | Mudah, PostgreSQL bawaan | Gratis tier terbatas, sleeping | Alternatif |

---

## Opsi A — Vercel (Disarankan, Termudah)

### Langkah 1: Siapkan Repository GitHub

```bash
cd d:\laragon\www\service-komputer
git init
git add .
git commit -m "Initial commit: siap deploy"
git remote add origin https://github.com/USERNAME/service-komputer.git
git push -u origin main
```

### Langkah 2: Buat Project Supabase Production

1. Buka [supabase.com](https://supabase.com) dan buat project baru
2. Catat **Project URL** dan **anon public key** dari *Project Settings → API*
3. Catat **service_role key** dari *Project Settings → API → Service Role*

### Langkah 3: Terapkan Migration Database

Di Supabase **SQL Editor**, jalankan setiap file migrasi **berurutan** dari `00001` sampai `00011`:

```
00001_init_fixed.sql
00002_seed.sql
00003_service_order_photos.sql
00004_service_workflow.sql
00005_ai_assistant.sql
00006_invoice_payment.sql
00007_notification_outbox.sql
00008_security_audit.sql
00009_teknisi_role_enum.sql
00010_teknisi_role_access.sql
00011_whatsapp_notifications.sql
```

> ⚠️ Penting: Jalankan dari database **kosong**. `00001` tidak idempoten — jalankan dua kali akan gagal.

### Langkah 4: Buat Admin Pertama

1. Buka URL production dan register akun melalui `/register`
2. Di Supabase SQL Editor:
```sql
update public.profiles
set role = 'admin'
where email = 'anda@domain.com';
```
3. Logout dan login ulang agar session refresh.

### Langkah 5: Deploy ke Vercel

1. Buka [vercel.com/new](https://vercel.com/new)
2. Import repository GitHub Anda
3. Tambahkan **semua** environment variable di *Settings → Environment Variables*:

**Wajib:**
| Variable | Nilai |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` atau JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` (hanya server!) |

Klik **Deploy**.

**Opsional — AI:**
| Variable | Nilai |
|----------|-------|
| `AI_PROVIDER` | `openai` atau `nvidia` atau `auto` |
| `OPENAI_API_KEY` | `sk-...` |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `NVIDIA_API_KEY` | `nvapi-...` |

**Opsional — Notifikasi:**
| Variable | Nilai |
|----------|-------|
| `RESEND_API_KEY` | `re_...` |
| `RESEND_FROM` | `Service Komputer <noreply@domain.com>` |
| `WHATSAPP_TOKEN` | Token Fonnte |
| `WHATSAPP_SENDER` | `6281234567890` |
| `CRON_SECRET` | String acak panjang (bila pakai cron) |

### Langkah 6: Konfigurasi Supabase Auth

Di Supabase *Authentication → URL Configuration*:

| Field | Nilai |
|-------|-------|
| Site URL | `https://domain-anda.vercel.app` |
| Redirect URLs | `https://domain-anda.vercel.app/**` |

---

## Opsi B — Docker / VPS (Murah, Kontrol Penuh)

### Persyaratan Server

- Ubuntu 22.04+ / Debian 12+
- Node.js 20+
- Reverse proxy (Nginx) dengan SSL (Let's Encrypt)
- Minimal 1 GB RAM

### Langkah 1: Clone dan Install

```bash
git clone https://github.com/USERNAME/service-komputer.git
cd service-komputer
npm ci --production
```

### Langkah 2: Siapkan Environment

```bash
cp .env.example .env
nano .env
```

### Langkah 3: Build dan Jalankan

```bash
npm run build
NODE_ENV=production npm run start
```

### Langkah 4: Nginx Reverse Proxy (contoh)

```nginx
server {
    listen 80;
    server_name domain-anda.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name domain-anda.com;

    ssl_certificate /etc/letsencrypt/live/domain-anda.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domain-anda.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Langkah 5: Process Manager (PM2)

```bash
npm install -g pm2
pm2 start "npm run start" --name service-komputer
pm2 save
pm2 startup
```

### Langkah 6: Cron untuk Notifikasi (opsional)

Tambahkan ke crontab (`crontab -e`):
```bash
*/5 * * * * curl -s "https://domain-anda.com/api/cron/dispatch?secret=CRON_SECRET" > /dev/null

---

## Environment Variables — Referensi Lengkap

Simpan di `.env` (Vercel) atau `.env.local` (development). **Jangan pernah commit.**

### Wajib (Production)

| Variable | Contoh | Keterangan |
|----------|--------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://abc.supabase.co` | Project Supabase production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_xxx` | Anon key, aman untuk browser |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_xxx` | **RAHASIA**, hanya server, melewati RLS |

### Opsional — AI (satu diantaranya cukup)

| Variable | Contoh | Keterangan |
|----------|--------|------------|
| `AI_PROVIDER` | `auto` | `openai` / `nvidia` / `auto` |
| `OPENAI_API_KEY` | `sk-...` | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model yang dipakai |
| `NVIDIA_API_KEY` | `nvapi-...` | NVIDIA NIM key (gratis tier tersedia) |
| `NVIDIA_MODEL` | `nvidia/nemotron-3-super-120b-a12b` | Model NIM |

### Opsional — Notifikasi Eksternal

| Variable | Contoh | Keterangan |
|----------|--------|------------|
| `RESEND_API_KEY` | `re_...` | Resend untuk email |
| `RESEND_FROM` | `Service Komputer <noreply@domain.com>` | Pengirim email |
| `WHATSAPP_TOKEN` | `...` | Token Fonnte |
| `WHATSAPP_SENDER` | `6281234567890` | Nomor pengirim Fonnte |
| `CRON_SECRET` | `string-acak-32-hex` | Proteksi endpoint cron |

### Opsional — Keamanan

| Variable | Contoh | Keterangan |
|----------|--------|------------|
| `FORCE_HTTPS_HEADERS` | `1` | Aktifkan HSTS + upgrade-insecure-requests **hanya** jika production benar-benar HTTPS |

---

## Checklist Sebelum Production

- [ ] `SUPABASE_SERVICE_ROLE_KEY` hanya ada di server, tidak pernah di client/browser
- [ ] Semua migration `00001`–`00011` diterapkan berurutan di database production
- [ ] Minimal satu akun `admin` sudah dibuat di tabel `profiles`
- [ ] URL production ditambahkan ke Supabase *Authentication → URL Configuration → Redirect URLs*
- [ ] `NEXT_PUBLIC_SUPABASE_URL` dan `ANON_KEY` menunjuk project production (bukan development)
- [ ] Bucket `service-order-photos` **tidak public** (private)
- [ ] API key AI sudah dirotasi bila pernah dibagikan
- [ ] `.env` / `.env.local` tidak di-commit ke Git (sudah di `.gitignore`)
- [ ] Health check merespons 200: `curl https://domain.com/api/health`
- [ ] `FORCE_HTTPS_HEADERS=1` **hanya** jika URL publik sudah HTTPS

---

## Health Check

```bash
curl -i https://domain-anda.com/api/health
```

Respons `200` dengan JSON berisi `status` dan `timestamp`.

---

## Keamanan Production

Sudah diterapkan di kode:

1. **Row Level Security (RLS)** — customer hanya bisa membaca data miliknya sendiri
2. **Session verification** — `auth.getUser()` (bukan `getSession()`), JWT diverifikasi setiap request
3. **Role-based access** — `requireCustomer()`, `requireAdmin()`, `requireTeknisi()`
4. **Trigger anti-escalation** — non-admin tidak bisa ubah role/email sendiri
5. **Fungsi database dibatasi** — `anon` dan `authenticated` tidak boleh eksekusi RPC langsung
6. **Validasi upload foto** — signature biner diverifikasi, bukan hanya MIME header
7. **Security headers** — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
8. **AI guardrails** — system prompt mencegah prompt injection dan membatasi topik

Perlu diperhatikan produksi:

- **Nonce CSP** — saat ini `script-src` memakai `'unsafe-inline'` karena Next.js App Router. Pertimbangkan nonce per-request untuk produksi tinggi risiko.
- **Rate limit AI admin** — in-memory per instance. Untuk multi-instance, pindahkan ke Redis atau database.
- **Cron notifikasi** — email/WhatsApp butuh scheduler untuk memproses antrean otomatis.

---

## Estimasi Biaya Bulanan

| Komponen | Gratis Tier | Berbayar (estimasi) |
|----------|-------------|---------------------|
| Vercel Hosting | Gratis (Hobby) | $20+/bulan (Pro) |
| Supabase Database | 500 MB, 2 project | $25+/bulan (Pro) |
| OpenAI API | Tidak ada gratis | ~$1-10/bulan (tergantung penggunaan) |
| NVIDIA NIM | Gratis tier tersedia | Berbayar setelah kuota |
| Resend Email | 100 email/hari | Berbayar setelah kuota |
| Fonnte WhatsApp | Tidak ada gratis | Berbayar |
| Domain .com / .id | — | ~$10-15/tahun |

**Total minimum untuk produksi:** ~$0 (gratis tier semua) hingga ~$50/bulan (semua berbayar).

---

## Troubleshooting Deployment

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Halaman kembali ke `/login` | Redirect URL salah di Supabase | Tambahkan URL production ke Redirect URLs |
| Foto tidak tampil | Bucket public salah | Pastikan bucket private + signed URL |
| AI "belum dikonfigurasi" | API key tidak ada | Isi `OPENAI_API_KEY` atau `NVIDIA_API_KEY` |
| Build gagal di Vercel | Environment variable hilang | Tambahkan semua variable di Vercel Settings |
| Notifikasi tidak terkirim | `SUPABASE_SERVICE_ROLE_KEY` hilang | Tambahkan variable di server |
| HSTS mencuri akses | `FORCE_HTTPS_HEADERS=1` di HTTP | Hapus variable atau gunakan HTTPS |

---

## Dukungan

Bila ada kendala deployment, buat issue di repository GitHub atau cek bagian Troubleshooting di `README.md`.
```