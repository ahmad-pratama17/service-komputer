# Service Komputer

Aplikasi layanan perbaikan komputer dan IT: customer memesan service, memantau
progres pengerjaan, dan menerima tagihan; admin memproses pesanan, mendiagnosa,
menentukan harga, dan menerbitkan invoice.

Built with Next.js (App Router), TypeScript, Tailwind CSS, dan Supabase
(Auth + Postgres + Row Level Security + Storage).

---

## Daftar Isi

- [Fitur](#fitur)
- [Stack Teknologi](#stack-teknologi)
- [Cara Menjalankan Project](#cara-menjalankan-project)
- [Environment Variables](#environment-variables)
- [Setup Supabase](#setup-supabase)
- [Setup Database](#setup-database)
- [Membuat Admin Pertama](#membuat-admin-pertama)
- [Setup OpenAI](#setup-openai)
- [Verifikasi Health Check](#verifikasi-health-check)
- [Deployment](#deployment)
- [Struktur Project](#struktur-project)
- [Catatan Keamanan](#catatan-keamanan)
- [Troubleshooting](#troubleshooting)

---

## Fitur

### Customer

| Fitur | Rute |
| --- | --- |
| Landing page | `/` |
| Katalog layanan publik | `/services` |
| Register | `/register` |
| Login | `/login` |
| Dashboard | `/dashboard` |
| Buat pesanan service | `/dashboard/services/new` |
| Daftar & riwayat pesanan | `/dashboard/services` |
| Status detail pesanan | `/dashboard/services/[id]` |
| Daftar tagihan | `/dashboard/invoices` |
| Detail tagihan | `/dashboard/invoices/[id]` |
| Notifikasi | `/dashboard/notifications` |
| AI Assistant | `/dashboard/ai` |
| Profil | `/dashboard/profile` |

### Admin

| Fitur | Rute |
| --- | --- |
| Login | `/login` (pakai akun admin) |
| Dashboard | `/admin` |
| Manajemen pelanggan | `/admin/customers`, `/admin/customers/[id]` |
| Manajemen layanan | `/admin/services` |
| Manajemen pesanan | `/admin/orders`, `/admin/orders/[id]` |
| Workflow status | Kartu "Ubah Status" di detail pesanan |
| Diagnosis & pricing | Kartu "Detail Teknis" di detail pesanan |
| Tagihan | `/admin/invoices`, dan di detail pesanan |
| Notifikasi | `/admin/notifications` |
| AI Copilot | `/admin/assistant`, tombol analyze di detail pesanan |

Admin dan customer memakai halaman login yang sama. Role dibaca dari tabel
`profiles`, jadi cukup daftar sekali lalu diubah role-nya di database.

---

## Stack Teknologi

| Layer | Teknologi |
| --- | --- |
| Framework | Next.js 16.3.5 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| Auth | Supabase Auth |
| Database | Supabase Postgres + RLS |
| Storage | Supabase Storage (bucket foto) |
| AI | OpenAI (default) atau NVIDIA NIM |
| Email | Resend (opsional) |
| WhatsApp | Fonnte (opsional) |
| Validasi | Zod |

---

## Cara Menjalankan Project

### Prasyarat

- Node.js 20 atau lebih baru (disarankan 22 LTS)
- Akun Supabase (gratis cukup untuk pengembangan)
- Akun OpenAI bila ingin memakai AI Assistant

### Langkah

```bash
# 1. Install dependency
npm install

# 2. Siapkan environment variable
cp .env.example .env.local
# lalu isi .env.local (lihat bagian Environment Variables)

# 3. Terapkan migration ke Supabase
#   lewat SQL Editor, atau:
npx supabase db push

# 4. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Script yang tersedia

```bash
npm run dev        # development server dengan hot reload
npm run build      # production build
npm run start      # jalankan hasil production build
npm run lint       # ESLint
npm run typecheck  # TypeScript, tanpa emit
npm run seed:demo  # buat akun + pesanan demo (butuh Supabase terhubung)
```

Jalankan `npm run lint` dan `npm run typecheck` sebelum commit.

> **Catatan Windows.** Kalau `npm` tidak ditemukan atau gagal dijalankan,
> gunakan `npm.cmd`. PowerShell secara default menolak skrip (`npm.ps1`), dan
> untuk mengubahnya permanen:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

---

## Mode Demo Lokal (tanpa Supabase)

Kalau `.env.local` belum diisi atau masih berupa nilai contoh, aplikasi otomatis
berjalan dalam **mode demo lokal**. Tidak perlu pengaturan apa pun:

```bash
npm run dev
```

Lalu buka `http://localhost:3000/login` dan masuk dengan salah satu akun ini
(kredensialnya juga ditampilkan di halaman login saat mode demo):

| Email | Password | Role |
| --- | --- | --- |
| `admin@demo.test` | `Demo#Admin123` | admin |
| `customer@demo.test` | `Demo#Customer123` | customer |
| `customer2@demo.test` | `Demo#Customer123` | customer |
| `teknisi@demo.test` | `Demo#Teknisi123` | teknisi |

Cara kerjanya:

- Seluruh data (akun, pesanan, tagihan, notifikasi, riwayat chat) disimpan di
  `data/demo-db.json` yang dibuat otomatis saat pertama dibuka. Data bertahan
  antar restart. Hapus file itu untuk mengulang dari awal.
- Login memakai password scrypt + cookie session bertanda tangan. Tidak ada
  database, tidak ada service eksternal.
- AI Assistant dan AI Copilot memakai penjawab aturan lokal — alur chat-nya
  sama persis (kirim, riwayat, hapus, rate limit), tapi jawabannya dari aturan
  sederhana, bukan model bahasa. Halaman AI menampilkannya dengan jelas.
- Batasan mode demo: upload foto tidak menyimpan file (metadata dicatat,
  galeri menampilkan placeholder), notifikasi email/WhatsApp tidak dikirim,
  dan semua data hanya ada di laptop sendiri.
- Begitu `.env.local` diisi kredensial Supabase asli, mode demo mati sendiri
  dan aplikasi memakai database sungguhan. Tidak ada kode yang perlu diubah.

Keputusan desain: jalur Supabase tidak diubah sama sekali. Setiap fungsi hanya
menambah `if (isDemoMode()) return demoXxx(...)` di baris pertama, jadi risiko
regresi ke jalur produksi minimal.

---

## Akun Demo (dengan Supabase)

Tidak ada akun bawaan di dalam repository, dan migration memang tidak pernah
membuat user — semua akun harus dibuat lewat registrasi. Agar tidak perlu
mendaftarkan akun satu per satu saat menguji, ada `scripts/seed-demo.mjs` yang
membuat akun dan data contoh sekaligus.

### Cara pakai

Ada dua cara. Pilih salah satu, jangan keduanya.

#### Opsi A — lewat script npm (disarankan)

Butuh `SUPABASE_SERVICE_ROLE_KEY` di `.env.local`. Script memakai Supabase
Admin API resmi, jadi tidak bergantung pada skema internal database.

```bash
npm run seed:demo
```

#### Opsi B — lewat SQL Editor (tanpa service-role key)

Kalau Anda tidak ingin menyimpan service-role key di laptop, jalankan file ini
di SQL Editor Supabase:

```
supabase/seed-demo-accounts.sql
```

File itu membuat akun yang sama persis. Kelemahannya: ia menulis langsung ke
`auth.users` dan `auth.identities`, yang merupakan skema internal GoTrue dan bisa
berbeda antar versi Supabase. Kalau gagal dengan pesan "column does not exist",
pakai Opsi A saja.

### Hasil

| Email | Password | Role |
| --- | --- | --- |
| `admin@demo.test` | `Demo#Admin123` | admin |
| `customer@demo.test` | `Demo#Customer123` | customer |
| `customer2@demo.test` | `Demo#Customer123` | customer |
| `teknisi@demo.test` | `Demo#Teknisi123` | teknisi |

Plus 4 pesanan dan 2 tagihan dengan berbagai status (baru masuk, menunggu
persetujuan, selesai, sudah dibayar) supaya dashboard admin tidak kosong saat
demo.

Untuk mengulang dari awal:

```bash
npm run seed:demo -- --reset
```

### Catatan penting

- Password di atas diketahui publik. **Jangan pernah jalankan script ini pada
  project production.**
- Script menolak jalan kalau `.env.local` masih berisi placeholder, dan
  menampilkan pesan yang jelas bukan gagal diam-diam.

---

## Environment Variables

Semua variable disimpan di `.env.local` (jangan di-commit). Salin dari
`.env.example`:

```bash
cp .env.example .env.local
```

### Wajib

| Variable | Keterangan |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase, contoh `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key. Aman untuk browser karena RLS |

### Server only (JANGAN di-prefix `NEXT_PUBLIC_`)

| Variable | Keterangan |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (`sb_secret_...` di project baru, JWT `service_role` di project lama). Wajib untuk `seed:demo` dan pemrosesan outbox email/WhatsApp. Melewati seluruh RLS |

> **Format key baru.** Project Supabase baru memakai `sb_publishable_*` (anon)
> dan `sb_secret_*` (secret), bukan JWT. Keduanya didukung aplikasi ini.
> Ambil dari Project Settings → API → Secret Keys, pakai tombol copy agar
> tidak terpotong.

> **Penting.** Variable yang tidak di-prefix `NEXT_PUBLIC_` hanya dibaca di
> server. Jangan pernah menaruhnya di kode client, dan jangan pernah memakai
> prefix `NEXT_PUBLIC_` untuk nilai rahasia.

### Opsional — AI

| Variable | Default | Keterangan |
| --- | --- | --- |
| `AI_PROVIDER` | `auto` | `openai`, `nvidia`, atau `auto` (pakai OpenAI bila key tersedia) |
| `OPENAI_API_KEY` | — | API key OpenAI |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model chat |
| `OPENAI_BASE_URL` | — | Bila memakai proxy OpenAI-compatible sendiri |
| `NVIDIA_API_KEY` | — | API key NVIDIA NIM |
| `NVIDIA_MODEL` | `nvidia/nemotron-3-super-120b-a12b` | Model NIM |
| `NVIDIA_BASE_URL` | `https://integrate.api.nvidia.com/v1` | Endpoint NIM |

Bila tidak ada satu pun key AI, aplikasi tetap jalan: halaman AI menampilkan
pesan bahwa fitur belum dikonfigurasi, dan tidak ada error yang menggagalkan
halaman lain.

### Opsional — notifikasi eksternal

| Variable | Keterangan |
| --- | --- |
| `RESEND_API_KEY` | API key Resend untuk email |
| `RESEND_FROM` | Pengirim, contoh `Service Komputer <noreply@domainmu.id>` |
| `WHATSAPP_TOKEN` | Token Fonnte |
| `WHATSAPP_SENDER` | Nomor pengirim Fonnte |

Semua kanal eksternal bersifat opsional. Notifikasi **in-app** tetap berjalan
tanpa kredensial apa pun. Baris outbox untuk kanal yang belum dikonfigurasi
tetap `pending` (tidak hilang) dan terkirim otomatis setelah kredensial diisi.

### Notifikasi WhatsApp (Fonnte)

Alurnya: trigger database menulis baris `whatsapp` ke `notification_outbox`
(migration `00011`), lalu aplikasi memproses antrean lewat cron atau tombol
manual dan mengirim via Fonnte.

Event yang masuk WhatsApp:

| Event | Penerima |
| --- | --- |
| Pesanan baru (`order.created`) | Staf (admin + teknisi) |
| Status pesanan berubah (`order.status_changed`) | Customer pemilik pesanan |
| Tagihan terbit (`invoice.issued`) | Customer pemilik pesanan |

Langkah setup:

1. Terapkan migration `00011_whatsapp_notifications.sql` di SQL Editor
   (setelah `00009` + `00010`).
2. Daftar di [fonnte.com](https://fonnte.com), hubungkan nomor WhatsApp
   pengirim, salin **token** dari dashboard Fonnte.
3. Isi di `.env.local`, lalu restart server:
   ```env
   WHATSAPP_TOKEN=...token-fonnte...
   WHATSAPP_SENDER=6281234567890
   ```
   `WHATSAPP_SENDER` adalah nomor yang dihubungkan di Fonnte (format
   `628...`, tanpa `+`/spasi).
4. Pastikan nomor HP penerima terisi di profil (customer mengisi saat
   registrasi; staf via SQL). Tanpa nomor valid, pesan dilewati dengan
   catatan di `last_error` dan antrean tetap jalan.
5. Proses antrean dengan salah satu cara:
   - **Tombol manual**: halaman Notifikasi admin → *Proses antrean
     WA/Email*. Cukup untuk pengujian dan volume kecil.
   - **Cron tiap 5 menit**: isi `CRON_SECRET` di `.env.local` (string acak
     panjang), restart, lalu buat task di Task Scheduler Windows:
     Action = `powershell.exe`, Arguments =
     `-NoProfile -Command "Invoke-RestMethod 'http://localhost:3000/api/cron/dispatch?secret=...isi-secret...'"`
     Trigger = tiap 5 menit, berjalan selama server `npm run dev` hidup.

Verifikasi (di SQL Editor):

```sql
-- Antrean WhatsApp yang menunggu diproses
select channel, status, count(*)
from public.notification_outbox
group by channel, status;

-- Baris WA terakhir + pesan error bila gagal
select title, message, status, attempts, last_error, created_at
from public.notification_outbox
where channel = 'whatsapp'
order by created_at desc
limit 10;
```

Uji end-to-end termurah: ubah satu status pesanan sebagai teknisi, lalu tekan
tombol manual — customer (bila nomornya valid dan token terisi) menerima WA
*"Status Pesanan Diperbarui"* dalam hitungan detik. Tanpa token, tombol
menjawab `0 diproses` dan baris tetap pending — itu normal, bukan error.

---

## Setup Supabase

### 1. Buat project

1. Buka [database.new](https://supabase.com/dashboard) dan buat project baru.
2. Tunggu sampai database selesai diinisialisasi.
3. Simpan URL project dan anon key dari **Project Settings → API**.

> Ambil key yang warnanya `anon public`. Jangan pernah memakai key
> `service_role` di kode browser.

### 2. Ambil service role key

**Project Settings → API → Service Role**. Nilai ini dipakai hanya di server
untuk memproses antrean notifikasi.

### 3. Konfigurasi URL

Di **Authentication → URL Configuration**:

| Field | Nilai |
| --- | --- |
| Site URL | URL aplikasi, contoh `http://localhost:3000` |
| Redirect URLs | Tambahkan `http://localhost:3000/**` untuk development |

Tambahkan URL production bila akan deploy.

### 4. Bucket Storage

Bucket `service-order-photos` dibuat oleh migration `00003`. Kalau ingin
membuat manual:

- Public: **No**
- File size limit: **4 MB**
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

Aplikasi memverifikasi signature biner file, bukan hanya header
`Content-Type`, jadi file yang di-rename tetap ditolak.

---

## Setup Database

Semua skema database ada di `supabase/migrations/` dan harus diterapkan **berurutan**:

| File | Isi |
| --- | --- |
| `00001_init.sql` | Enum, tabel inti, fungsi, RLS, trigger |
| `00002_seed.sql` | 7 layanan contoh |
| `00003_service_order_photos.sql` | Bucket Storage + tabel foto |
| `00004_service_workflow.sql` | Workflow status, RPC admin, diagnosis |
| `00005_ai_assistant.sql` | Tabel percakapan AI + RLS |
| `00006_invoice_payment.sql` | Invoice dan status pembayaran |
| `00007_notification_outbox.sql` | Outbox notifikasi + trigger |
| `00008_security_audit.sql` | Hardening keamanan (lihat bagian Catatan Keamanan) |
| `00009_teknisi_role_enum.sql` | Nilai enum `teknisi` (jalankan sendiri, lihat Troubleshooting) |
| `00010_teknisi_role_access.sql` | Helper `is_staff` + RLS peran teknisi |
| `00011_whatsapp_notifications.sql` | Antrean WhatsApp untuk 3 event |

### Cara menerapkan

**Opsi A — SQL Editor (paling sederhana)**

1. Buka **SQL Editor** di dashboard Supabase.
2. Jalankan setiap file satu per satu, dari `00001` sampai `00008`, berurutan.

**Opsi B — Supabase CLI**

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

> **Penting.** Migration **wajib** dijalankan berurutan dan hanya satu kali.
> `00001_init.sql` memakai `create table` tanpa `if not exists`, jadi menjalankannya
> dua kali akan gagal. Jalankan dari database yang kosong untuk project baru.

### Verifikasi

Setelah semua migration diterapkan, cek di SQL Editor:

```sql
-- Harus mengembalikan 8 baris
select count(*) from information_schema.tables
where table_schema = 'public';

-- 7 layanan contoh
select count(*) from public.services;

-- Bucket foto
select id from storage.buckets where id = 'service-order-photos';
```

---

## Membuat Admin Pertama

Tidak ada akun admin bawaan. Registrasi selalu membuat akun dengan role
`customer`, jadi buat akun lewat UI lalu naikkan role-nya:

1. Buka `http://localhost:3000/register` dan daftar (misal
   `admin@servicekomputer.id`).
2. Di **SQL Editor**, cari `id` akun tersebut:

```sql
select id, email, role
from public.profiles
where email = 'admin@servicekomputer.id';
```

3. Naikkan role:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@servicekomputer.id';
```

4. Logout lalu login lagi agar sesi ter-refresh.

Role dibaca dari tabel `profiles` pada setiap request, jadi perubahan langsung
berlaku tanpa perlu rebuild.

> **Kenapa tidak lewat UI?** Trigger `prevent_profile_privilege_escalation`
> sengaja menolak user non-admin yang mencoba mengubah `role` atau `email`
> miliknya sendiri. Promoosi role hanya bisa lewat SQL Editor atau service role.

Untuk menambah admin lain, ulangi langkah yang sama. Role `admin` mendapat
akses ke seluruh halaman `/admin`.

### Membuat Akun Teknisi

Caranya sama — daftar lewat UI, lalu set role ke `teknisi` (bukan `admin`):

```sql
update public.profiles
set role = 'teknisi'
where email = 'teknisi@servicekomputer.id';
```

Pembagian peran:

| Kemampuan | Customer (`/dashboard`) | Teknisi (`/teknisi`) | Admin (`/admin`) |
| --- | --- | --- | --- |
| Buat & pantau pesanan sendiri | Ya | — | — |
| Lihat semua pesanan | — | Ya | Ya |
| Ubah status pesanan | — | Ya | Ya |
| Tulis diagnosis | — | Ya | Ya |
| Unggah/hapus foto hasil | — | Ya | Ya |
| AI Copilot per pesanan | — | Ya | Ya |
| Lihat tagihan | Milik sendiri | Ya | Ya |
| Buat/ubah status tagihan | — | — | Ya |
| Lihat katalog layanan | Ya (aktif) | Ya (semua) | Ya |
| Kelola layanan/pelanggan | — | — | Ya |

Teknisi mengirim diagnosis lewat form yang hanya berisi field diagnosis;
server mengabaikan biaya/catatan internal bila pemanggil teknisi, dan RPC
database menolak peran selain staf. Migration `00009` + `00010` wajib
diterapkan sebelum akun teknisi dibuat (nilai enum + hak RLS-nya).

---

## Setup OpenAI

AI Assistant customer dan AI Copilot admin memakai provider yang dikonfigurasi
lewat environment variable.

### Memakai OpenAI

1. Buat API key di [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Isi di `.env.local`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

3. Restart server (`npm run dev` perlu di-restart agar env terbaca).

OpenAI mendukung Structured Outputs, sehingga bagian hasil AI Copilot
(ringkasan, dugaan penyebab, rekomendasi, langkah pemeriksaan, catatan)
dijamin valid sesuai schema.

### Memakai NVIDIA NIM (gratis)

1. Ambil key di [build.nvidia.com/settings](https://build.nvidia.com/settings).
2. Isi di `.env.local`:

```env
AI_PROVIDER=nvidia
NVIDIA_API_KEY=nvapi-...
```

> NIM memakai endpoint OpenAI-compatible `chat/completions` dan **tidak**
> mendukung Structured Outputs, sehingga AI Copilot beralih ke mode JSON lewat
> prompt dan tetap divalidasi ulang di sisi server sebelum ditampilkan.

### Tanpa AI

Hapus semua key AI. Aplikasi tetap berfungsi penuh; hanya halaman AI yang
menampilkan "`AI Assistant belum dikonfigurasi`". Ini berguna untuk demo ketika
belum ada kuota API.

### Catatan privasi

Riwayat percakapan customer disimpan di tabel `ai_conversations` dan hanya bisa
dibaca pemiliknya sendiri (RLS). Jangan kirim kata sandi, nomor kartu, atau
data pribadi sensitif ke chat.

---

## Verifikasi Health Check

Ada endpoint health check stateless untuk mengecek deployment:

```bash
curl -i https://domain-anda.vercel.app/api/health
```

Respons `200` dengan body JSON berisi `status` dan `timestamp`. Endpoint ini
tidak mengecek koneksi database, hanya memastikan route dapat dijangkau.

---

## Deployment

### Vercel (recommended)

1. Push repository ke GitHub.
2. Buka [vercel.com/new](https://vercel.com/new) dan import repository.
3. Tambahkan **semua** environment variable dari bagian
   [Environment Variables](#environment-variables) di **Settings → Environment
   Variables**. Jangan lupa `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy.
5. Di Supabase, tambahkan URL production ke
   **Authentication → URL Configuration → Redirect URLs**.

Vercel otomatis menjalankan `npm run build` saat deploy.

### Docker / VPS

Build di server lalu jalankan dengan Node:

```bash
npm ci
npm run build
npm run start
```

Pastikan `NODE_ENV=production` dan seluruh environment variable tersedia di
runtime (bukan hanya saat build).

### Checklist sebelum production

- [ ] `SUPABASE_SERVICE_ROLE_KEY` hanya ada di server, tidak pernah di client
- [ ] API key OpenAI/NVIDIA sudah dirotasi bila pernah dibagikan
- [ ] Migration `00004`–`00008` sudah diterapkan
- [ ] Minimal satu akun admin sudah dibuat
- [ ] Redirect URL di Supabase Authentication sudah mencakup domain production
- [ ] `NEXT_PUBLIC_SUPABASE_URL` dan `ANON_KEY` menunjuk project yang benar
- [ ] Bucket `service-order-photos` tidak public

---

## Struktur Project

```
src/
├── app/
│   ├── (landing)/          # landing page + katalog publik
│   ├── (auth)/             # login, register, lupa password
│   ├── (customer)/         # area pelanggan (butuh session customer)
│   ├── (admin)/            # area admin (butuh session admin)
│   ├── actions/            # server actions
│   ├── api/health/         # health check
│   ├── layout.tsx          # root layout
│   ├── not-found.tsx       # 404
│   └── proxy.ts            # refresh session per request
├── components/
│   ├── admin/              # komponen khusus admin
│   ├── auth/               # form login/register/profil
│   ├── customer/           # komponen khusus customer
│   ├── landing/            # section landing page
│   ├── layout/             # sidebar, shell, notifikasi bell
│   └── ui/                 # primitive: button, card, table, dialog, dll
├── lib/
│   ├── ai/                 # provider AI, prompt, rate limit, copilot
│   ├── auth/               # session & guard role
│   ├── notifications/      # outbox, dispatcher, kanal (in-app/email/WhatsApp)
│   ├── supabase/           # client browser/server/admin/middleware
│   ├── validations/        # schema Zod
│   ├── admin.ts            # query admin
│   ├── orders.ts           # query customer
│   └── ...
├── types/                  # tipe domain & database
└── proxy.ts

supabase/migrations/        # skema database (00001–00008)
```

---

## Catatan Keamanan

Sudah diterapkan:

- Row Level Security pada seluruh tabel publik; customer hanya bisa membaca
  data miliknya sendiri.
- Otorisasi berlapis: `proxy.ts` menyegarkan session, tiap halaman memanggil
  `requireCustomer()` atau `requireAdmin()` yang memverifikasi role dari
  tabel `profiles`.
- Session diverifikasi dengan `auth.getUser()`, bukan `getSession()`, sehingga
  JWT dari cookie tidak dipercaya begitu saja.
- Trigger `prevent_profile_privilege_escalation` menutup perubahan role/email
  oleh non-admin.
- Fungsi database yangelper dicabut hak `EXECUTE`-nya dari `anon` dan
  `authenticated` supaya tidak bisa dipanggil langsung lewat PostgREST RPC.
- Trigger memaksa kolom yangQzat admin (status, biaya, diagnosis) pada
  `service_orders` agar customer tidak bisa mengisinya sendiri.
- Upload foto diverifikasi dari signature biner file, bukan hanya MIME header.
- Pesan error dari Postgres/PostgREST dipetakan ke teks Bahasa Indonesia lewat
  `src/lib/db-errors.ts`, sehingga detail internal seperti nama constraint atau
  kolom tidak pernah sampai ke browser.
- Header keamanan: `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, dan `Content-Security-Policy`.
  `script-src` memakai `'unsafe-inline'` karena Next.js App Router wajib inline
  script untuk navigasi client-side — tanpanya semua pindah halaman macet di
  skeleton loading. `style-src` juga `'unsafe-inline'` karena mode dev
  menyuntikkan style inline; tanpanya halaman tampil polos. `'unsafe-eval'`
  hanya dipasang saat dev (React dev membutuhkannya; production tidak).
  Nonce per-request adalah pengganti ideal `'unsafe-inline'` (belum ada).
  `Cross-Origin-Opener-Policy` sengaja tidak dipasang (diabaikan browser di
  origin HTTP tak terpercaya; anti-clickjacking sudah ditangani dua header
  lain). `Strict-Transport-Security` dan `upgrade-insecure-requests` hanya
  dikirim bila `FORCE_HTTPS_HEADERS=1` — mengaktifkannya di deployment HTTP
  (termasuk Laragon lokal) membuat browser menaikkan semua CSS/JS ke HTTPS
  dan mengingat HSTS, sehingga situs rusak sampai HSTS dihapus manual.
- Guardrail prompt injection pada system prompt AI Assistant.

Catatan tentang CSP: `style-src` sengaja belum ditambahkan karena bentrok
dengan style inline yang disuntikkan Next.js. Directive yang tidak merusak
render tapi menutup vektor nyata sudah aktif: `object-src 'none'`,
`base-uri 'self'`, `form-action 'self'`, dan `frame-ancestors 'none'`.

Belum ada dan perlu dipertimbangkan untuk produksi:

- **Nonce CSP untuk `script-src`** sebagai pengganti `'unsafe-inline'`; lihat
  catatan di bagian [Catatan Keamanan](#catatan-keamanan).
- Rate limit pada endpoint auth masih mengandalkan rate limit bawaan Supabase.
- Rate limit AI admin masih in-memory per instance, jadi tidak dibagi antar
  instance. Untuk deployment multi-instance, pindahkan ke database atau Redis.
- Dispatcher email/WhatsApp memerlukan scheduler (cron) untuk memproses antrean.
  Saat ini antrean hanya terisi saat request masuk.

---

## Troubleshooting

### `Missing Supabase environment variables`

`NEXT_PUBLIC_SUPABASE_URL` atau `NEXT_PUBLIC_SUPABASE_ANON_KEY` belum diisi.
Salin `.env.example` ke `.env.local`, lalu isi keduanya.

### Halaman dashboard selalu kembali ke `/login`

Session tidak terbawa. Pastikan Redirect URL di Supabase Authentication sudah
memuat `http://localhost:3000/**`, lalu logout dan login ulang.

### Daftar akun baru langsung masuk, tapi `/admin` menolak

Role masih `customer`. Ikuti bagian
[Membuat Admin Pertama](#membuat-admin-pertama).

### AI menampilkan "belum dikonfigurasi"

Tidak ada `OPENAI_API_KEY` atau `NVIDIA_API_KEY` yang terbaca. Pastikan file
bernama `.env.local` (bukan `.env`), lalu restart development server.

### Foto gagal diunggah

- Ukuran maksimal 4 MB per foto, maksimal 4 foto per pesanan.
- Format harus JPG, PNG, WEBP, atau GIF **asli**. File yang di-rename dari
  format lain akan ditolak karena signature biner tidak cocok.
- Pastikan bucket `service-order-photos` sudah ada. Jalankan migration
  `00003_service_order_photos.sql` kalau belum.

### Migration gagal saat diterapkan

- Pastikan dijalankan **berurutan** dari `00001`.
- `00009_teknisi_role_enum.sql` wajib dijalankan **sendiri** (satu statement,
  commit) sebelum `00010` — PostgreSQL melarang `ALTER TYPE ... ADD VALUE` di
  dalam blok transaksi.
- Jalankan di database kosong untuk project baru. `00001_init.sql` tidak
  idempoten.
- `00008_security_audit.sql` memberi peringatan (bukan error) bila ada tagihan
  ganda, dan hanya melewati pembuatan index unik. Rapikan data duplikat lalu
  jalankan ulang index-nya secara manual.

### Perubahan role admin tidak aktif

Cek role di tabel `profiles`, bukan di dashboard. Kalau memakai Indonesian
Supabase Dashboard, tabelnya ada di **Database → Table Editor**.

### notificaciones email/WhatsApp tidak terkirim

- Pastikan `SUPABASE_SERVICE_ROLE_KEY` terisi; tanpa itu RLS memblokir
  pemrosesan antrean.
- Isi kredensial kanal (`RESEND_API_KEY` / `WHATSAPP_TOKEN` + `WHATSAPP_SENDER`).
- Periksa tabel `notification_outbox` untuk melihat `status` dan `last_error`.
- Kanal tanpa kredensial sengaja dilewati dan ditandai terkirim supaya antrean
  tidak menumpuk.