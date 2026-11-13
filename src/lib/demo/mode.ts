/**
 * Mode demo lokal.
 *
 * Aplikasi berjalan dalam mode demo kalau kredensial Supabase tidak diisi
 * ATAU masih berupa nilai contoh dari `.env.example` (`https://xxxx...`,
 * `eyJhbGciOi...`, dan sejenisnya). Pengecekan string kosong saja tidak
 * cukup: `.env.local` bawaan repo sudah terisi placeholder yang truthy,
 * sehingga tanpa deteksi ini aplikasi justru masuk jalur Supabase dengan
 * URL yang tidak bisa di-resolve.
 *
 * Heuristik di bawah aman untuk nilai asli: URL project asli berbentuk
 * `https://<20-karakter>.supabase.co` (±40 karakter) dan anon key JWT
 * selalu >150 karakter tanpa pola contoh.
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

export function isDemoMode(): boolean {
  if (
    process.env.DEMO_MODE === "1" ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "1"
  ) {
    return true;
  }

  return (
    looksPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    looksPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/** Nama cookie session demo. Terpisah dari cookie Supabase. */
export const DEMO_SESSION_COOKIE = "demo_session";

/** Akun demo yang ditampilkan di halaman login mode demo. */
export const DEMO_ACCOUNTS: { email: string; password: string; role: string }[] =
  [
    { email: "admin@demo.test", password: "Demo#Admin123", role: "admin" },
    { email: "customer@demo.test", password: "Demo#Customer123", role: "customer" },
    {
      email: "customer2@demo.test",
      password: "Demo#Customer123",
      role: "customer",
    },
    { email: "teknisi@demo.test", password: "Demo#Teknisi123", role: "teknisi" },
  ];
