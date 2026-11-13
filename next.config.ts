import type { NextConfig } from "next";

/**
 * Header keamanan dan Content-Security-Policy.
 *
 * Foto pesanan disajikan lewat signed URL Supabase dengan bucket privat, tapi
 * halaman tetap bisa menerima HTML yang di-paste dari luar. `nosniff` mencegah
 * browser menebak-nebak tipe konten, dan `frame-ancestors 'none'` mencegah
 * aplikasi ini di-embed dalam iframe (clickjacking pada form admin).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Nilai contoh dari `.env.example` harus dianggap tidak ada — sama seperti
 * `isDemoMode()` di `src/lib/demo/mode.ts`. Tanpa ini, URL placeholder ikut
 * terpanggang ke `connect-src` dan aplikasi salah masuk jalur Supabase.
 */
function looksPlaceholder(value: string | undefined): boolean {
  if (!value) {
    return true;
  }
  const v = value.trim();
  return (
    v.length === 0 ||
    v.length < 20 ||
    /xxxx\.|example|your-|changeme|placeholder|\.\.\.|\$\{/.test(v)
  );
}

/**
 * Origin Supabase untuk `connect-src` (fetch dari browser) dan `img-src`
 * (signed URL foto pesanan).
 *
 * Penting: kalau `NEXT_PUBLIC_SUPABASE_URL` belum ada saat build, hasilnya
 * null. Mengiku(origin kosong) dikombinasikan dengan `https:` sebagai
 * cadangan supaya aplikasi tetap berfungsi albeit longgar, bukan ikut mati
 * karena semua panggilan Supabase diblokir CSP.
 */
const supabaseOrigin = (() => {
  try {
    return supabaseUrl && !looksPlaceholder(supabaseUrl)
      ? new URL(supabaseUrl).origin
      : null;
  } catch {
    return null;
  }
})();

/**
 * Header HTTPS-only (`upgrade-insecure-requests` + HSTS) hanya dikirim bila
 * deployment benar-benar diakses lewat HTTPS.
 *
 * Alasannya dua bug nyata yang pernah terjadi di deployment HTTP lokal:
 *  1. `upgrade-insecure-requests` membuat browser menaikkan SEMUA subresource
 *     (CSS/JS/font) dari http:// menjadi https:// — hasilnya halaman tampil
 *     tanpa style dan mati total karena tidak ada yang melayani https.
 *  2. HSTS yang terkirim lewat HTTP membuat browser mengingat "domain ini
 *     khusus HTTPS" sampai 2 tahun, sehingga kunjungan berikutnya paksa https
 *     dan situs tidak bisa dibuka sampai HSTS dihapus manual
 *     (chrome://net-internals/#hsts).
 *
 * `NODE_ENV=production` TIDAK boleh jadi patokan karena `npm run start`
 * selalu production walau diakses lewat http://localhost. Opt-in eksplisit:
 * set `FORCE_HTTPS_HEADERS=1` hanya bila URL publik memang https://
 * (mis. Vercel — meski Vercel sebenarnya sudah mengirim HSTS sendiri).
 */
const useHttpsOnlyHeaders = process.env.FORCE_HTTPS_HEADERS === "1";

/**
 * Content-Security-Policy.
 *
 * Dua pelajaran dari console browser yang terbukti memecahkan aplikasi:
 *  1. `script-src` WAJIB ada dengan 'unsafe-inline': Next.js App Router
 *     memakai inline script (`self.__next_f.push(...)`) untuk flight data.
 *     Tanpanya semua navigasi client-side macet di skeleton loading.
 *     Nonce per-request adalah pengganti idealnya (TODO).
 *  2. `style-src` WAJIB ada dengan 'unsafe-inline': mode dev menyuntikkan
 *     style lewat tag <style> (styleTagTransform, font Geist). Tanpanya
 *     halaman tampil tanpa style sama sekali. Risiko style injection jauh
 *     lebih kecil daripada script, jadi tradeoff ini wajar.
 *  3. React dev memakai eval() untuk debugging (callstack). Tanpa
 *     'unsafe-eval', dev tools React error. React production tidak pernah
 *     pakai eval, jadi directive ini hanya dipasang saat BUKAN production
 *     (next.config dievaluasi dengan NODE_ENV=development oleh `npm run dev`
 *     dan =production saat `npm run build`, jadi pemisahannya tepat).
 */
function buildCsp(): string {
  // Cadangan longgar hanya dipakai bila origin tidak bisa dibaca saat build.
  const connectSources = supabaseOrigin
    ? `'self' ${supabaseOrigin} wss://*.supabase.co`
    : "'self' https: wss://*.supabase.co";

  const scriptSources = ["'self'", "'unsafe-inline'"];
  if (process.env.NODE_ENV !== "production") {
    scriptSources.push("'unsafe-eval'");
  }

  const directives = [
    "default-src 'self'",
    // Next.js App Router WAJIB inline script (`self.__next_f.push(...)` untuk
    // flight data navigasi client-side). Tanpa 'unsafe-inline', browser
    // memblokirnya dan semua navigasi sidebar macet di skeleton loading
    // selamanya — persis gejala yang terjadi di /dashboard/ai. Ini tradeoff
    // sadar: nonce per-request adalah solusi idealnya (TODO), tapi butuh
    // middleware nonce yang belum ada.
    `script-src ${scriptSources.join(" ")}`,
    // Dev menyuntik style inline; tanpanya halaman tampil polos. Lihat
    // komentar fungsi di atas.
    "style-src 'self' 'unsafe-inline'",
    // blob: untuk preview foto lokal sebelum diunggah; https: untuk signed URL.
    "img-src 'self' blob: data: https:",
    `connect-src ${connectSources}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  // Hanya bila deployment benar-benar HTTPS (lihat komentar di atas).
  if (useHttpsOnlyHeaders) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Cross-Origin-Opener-Policy SENGAJA tidak dipasang. Di origin tak
  // terpercaya (http://*.test) browser mengabaikannya sambil mencetak
  // warning ke console, dan aplikasi ini tidak punya alur popup sehingga
  // manfaatnya nihil. Anti-clickjacking tetap ditangani X-Frame-Options
  // + frame-ancestors 'none' di atas.
  // HSTS hanya bila deployment benar-benar HTTPS (lihat komentar di atas).
  // Di localhost HTTP, browser akan mengingat HSTS untuk domain itu dan bisa
  // merusak akses lokal berikutnya.
  ...(useHttpsOnlyHeaders
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  { key: "Content-Security-Policy", value: buildCsp() },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;