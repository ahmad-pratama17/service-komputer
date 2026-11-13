import type { SupabaseClient } from "@supabase/supabase-js";
import { ORDER_PHOTO_BUCKET } from "@/lib/constants";
import { sanitizeFileName } from "@/lib/validations/order";
import type { Database } from "@/types/database";
import type { OrderPhotoType } from "@/types";

export type PhotoStore = SupabaseClient<Database>;

export type UploadedPhoto = {
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  photo_type: OrderPhotoType;
};

export type UploadResult =
  | { ok: true; photos: UploadedPhoto[] }
  | { ok: false; error: string };

export function buildPhotoPath(
  customerId: string,
  orderId: string,
  fileName: string,
): string {
  return `${customerId}/${orderId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

export async function removeStoredPhotos(
  supabase: PhotoStore,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) {
    return;
  }
  await supabase.storage.from(ORDER_PHOTO_BUCKET).remove(paths);
}

/**
 * Mengunggah foto ke bucket dan mengembalikan metadata yang siap disimpan.
 * Metadata di DB belum ditulis; pemanggil wajib memanggil insertPhotoMetadata.
 * Objek yang sudah terunggah akan dibersihkan otomatis bila ada file gagal.
 */
export async function uploadOrderPhotos(
  supabase: PhotoStore,
  customerId: string,
  orderId: string,
  files: File[],
  photoType: OrderPhotoType = "issue",
): Promise<UploadResult> {
  const photos: UploadedPhoto[] = [];
  const storedPaths: string[] = [];

  for (const file of files) {
    const storagePath = buildPhotoPath(customerId, orderId, file.name);
    const { error } = await supabase.storage
      .from(ORDER_PHOTO_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (error) {
      await removeStoredPhotos(supabase, storedPaths);
      return {
        ok: false,
        error: `Gagal mengunggah foto "${file.name}". Silakan coba lagi.`,
      };
    }

    storedPaths.push(storagePath);
    photos.push({
      storage_path: storagePath,
      file_name: file.name,
      content_type: file.type,
      size_bytes: file.size,
      photo_type: photoType,
    });
  }

  return { ok: true, photos };
}

/**
 * Menyimpan metadata foto. Mengembalikan pesan error bila insert gagal agar
 * file yatim di storage bisa dibersihkan dan pengguna diberi tahu.
 */
export async function insertPhotoMetadata(
  supabase: PhotoStore,
  orderId: string,
  photos: UploadedPhoto[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (photos.length === 0) {
    return { ok: true };
  }

  const rows = photos.map((photo) => ({ order_id: orderId, ...photo }));

  // Insert metadata diulang beberapa kali karena kegagalan biasanya bersifat
  // sementara (koneksi / lock), sedangkan file sudah terlanjur terunggah.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { error } = await supabase.from("service_order_photos").insert(rows);
    if (!error) {
      return { ok: true };
    }
  }

  return { ok: false, error: "Foto terunggah tetapi gagal menyimpan data fotonya." };
}

export async function deleteOrderPhoto(
  supabase: PhotoStore,
  photo: { id: string; storage_path: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: storageError } = await supabase.storage
    .from(ORDER_PHOTO_BUCKET)
    .remove([photo.storage_path]);

  const { error: rowError } = await supabase
    .from("service_order_photos")
    .delete()
    .eq("id", photo.id);

  if (storageError || rowError) {
    return { ok: false, error: "Gagal menghapus foto." };
  }

  return { ok: true };
}
