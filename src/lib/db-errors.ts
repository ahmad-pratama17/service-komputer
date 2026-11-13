/**
 * Pemetaan error Postgres/PostgREST ke pesan yang aman ditampilkan.
 *
 * `error.message` dari PostgREST bisa memuat detail internal seperti nama
 * constraint, nama kolom, atau potongan kueri. Untuk admin (yang memang
 * sudah punya akses tinggi) risikonya kecil, tapi untuk customer halaman
 * yang sama tidak boleh membocorkan struktur database.
 *
 * Karena itu semua kode yang mungkin muncul dari trigger dan RPC dipetakan
 * ke pesan Bahasa Indonesia, dan sisanya jatuh ke `fallback` generik.
 * Detail aslinya tidak pernah dikirim ke klien.
 */
export type DbErrorLike = {
  code?: string | null;
  message?: string | null;
};

const CODE_MESSAGE: Record<string, string> = {
  // RLS / tanpa hak akses
  "42501": "Anda tidak memiliki akses ke tindakan ini.",
  // raise_exception dari trigger/RPC (P0002 = pesanan tidak ditemukan/tidak milik)
  P0001: "Permintaan tidak dapat diproses.",
  P0002: "Data tidak ditemukan atau tidak dapat diakses.",
  //Violasi batasan kolom
  "22001": "Nilai terlalu panjang untuk kolom ini.",
  "22003": "Nilai numerik di luar rentang yang diperbolehkan.",
  "23502": "Kolom wajib belum diisi.",
  "23503": "Data yang dirujuk tidak ditemukan.",
  "23505": "Data sudah ada dan tidak boleh diduplikasi.",
  "23514": "Nilai tidak memenuhi aturan validasi.",
  "22P02": "Format data tidak valid.",
  //batas waktu / koneksi
  "57014": "Permintaan terlalu lama. Silakan coba lagi.",
  "53300": "Server sedang sibuk. Silakan coba lagi.",
  "08006": "Koneksi ke database terputus. Silakan coba lagi.",
};

const GENERIC =
  "Terjadi kesalahan saat memproses data. Silakan coba lagi.";

/**
 * Mengubah error database menjadi pesan yang aman untuk ditampilkan ke user.
 *
 * @param fallback Pesan spesifik untuk aksi yang gagal, mis. "Gagal
 *   memperbarui status pesanan." Dipakai bila kode error tidak dikenal.
 */
export function dbErrorMessage(
  error: DbErrorLike | null | undefined,
  fallback = GENERIC,
): string {
  const code = error?.code?.trim();

  if (code && code in CODE_MESSAGE) {
    return CODE_MESSAGE[code];
  }

  // Tanpa kode yang dikenal, jangan pernah tukar `error.message` mentah ke
  // klien: isinya bisa memuat nama constraint atau kolom.
  return fallback;
}