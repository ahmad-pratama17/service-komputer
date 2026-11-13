"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createOrderSchema,
  orderFormError,
  orderFormFromZod,
  validateOrderPhotos,
  verifyPhotoSignatures,
  type OrderFormState,
  type OrderFormValues,
} from "@/lib/validations/order";
import {
  insertPhotoMetadata,
  removeStoredPhotos,
  uploadOrderPhotos,
} from "@/lib/order-photos";
import { dbErrorMessage } from "@/lib/db-errors";
import { isDemoMode } from "@/lib/demo/mode";
import {
  demoAddHistory,
  demoBuildOrderNumber,
  demoMarkAllNotificationsRead,
  demoMarkNotificationRead,
  demoNotifyAdmins,
} from "@/lib/demo/mutations";
import { loadDb, saveDb } from "@/lib/demo/store";

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const ORDER_NUMBER_ATTEMPTS = 5;

function buildOrderNumber(date: Date = new Date()): string {
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `SRV-${ymd}-${suffix}`;
}

function collectValues(formData: FormData): OrderFormValues {
  const values: OrderFormValues = {};
  for (const key of [
    "serviceId",
    "deviceType",
    "deviceBrand",
    "deviceModel",
    "problemDescription",
    "address",
    "preferredSchedule",
    "additionalNotes",
  ]) {
    const entry = formData.get(key);
    values[key] = typeof entry === "string" ? entry : "";
  }
  return values;
}

/**
 * Pembuatan pesanan mode demo: validasi sama persis (schema + jadwal),
 * tulis ke store lokal, beri tahu admin dan customer, lalu redirect ke
 * detail seperti alur produksi. Foto dilewati — tidak ada storage lokal;
 * batasannya didokumentasikan di README.
 */
async function createDemoOrder(formData: FormData): Promise<OrderFormState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const values = collectValues(formData);

  const parsed = createOrderSchema.safeParse({
    serviceId: values.serviceId,
    deviceType: values.deviceType,
    deviceBrand: values.deviceBrand || undefined,
    deviceModel: values.deviceModel || undefined,
    problemDescription: values.problemDescription,
    address: values.address || undefined,
    preferredSchedule: values.preferredSchedule || undefined,
    additionalNotes: values.additionalNotes || undefined,
  });

  if (!parsed.success) {
    return orderFormFromZod(parsed.error, values);
  }

  const rawSchedule = parsed.data.preferredSchedule;
  if (rawSchedule && Number.isNaN(Date.parse(rawSchedule))) {
    return orderFormError("Jadwal yang dipilih tidak valid.", values);
  }

  const db = loadDb();
  const serviceExists = db.services.some(
    (service) => service.id === parsed.data.serviceId && service.is_active,
  );
  if (!serviceExists) {
    return orderFormError("Layanan yang dipilih tidak tersedia.", values);
  }

  const orderId = crypto.randomUUID();
  const now = new Date().toISOString();
  db.orders.push({
    id: orderId,
    order_number: demoBuildOrderNumber(),
    customer_id: user.id,
    service_id: parsed.data.serviceId,
    device_type: parsed.data.deviceType,
    device_brand: parsed.data.deviceBrand || null,
    device_model: parsed.data.deviceModel || null,
    problem_description: parsed.data.problemDescription,
    address: parsed.data.address || null,
    preferred_schedule: rawSchedule
      ? new Date(rawSchedule).toISOString()
      : null,
    additional_notes: parsed.data.additionalNotes || null,
    status: "pending",
    diagnosis: null,
    estimated_cost: null,
    final_cost: null,
    admin_notes: null,
    created_at: now,
    updated_at: now,
  });
  demoAddHistory(db, orderId, null, "pending", "Pesanan diterima.", null);

  const orderNumber =
    db.orders.find((row) => row.id === orderId)?.order_number ?? "";
  demoNotifyAdmins(
    db,
    "Pesanan Baru",
    `Pesanan ${orderNumber} dari ${user.name} menunggu diproses.`,
    "order",
  );
  saveDb(db);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/services");
  revalidatePath(`/dashboard/services/${orderId}`);
  redirect(`/dashboard/services/${orderId}?created=1`);
}

export async function createOrderAction(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  if (isDemoMode()) {
    return createDemoOrder(formData);
  }

  if (!hasSupabaseEnv) {
    return orderFormError(
      "Konfigurasi Supabase belum diatur. Isi .env.local terlebih dahulu.",
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const values = collectValues(formData);
  const files = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const photosCheck = validateOrderPhotos(files);
  if (!photosCheck.ok) {
    return orderFormError(photosCheck.error, values);
  }

  // Header Content-Type bisa dipalsukan, jadi isi filenya ikut diperiksa.
  const signatureCheck = await verifyPhotoSignatures(files);
  if (!signatureCheck.ok) {
    return orderFormError(signatureCheck.error, values);
  }

  const parsed = createOrderSchema.safeParse({
    serviceId: values.serviceId,
    deviceType: values.deviceType,
    // String kosong diubah ke undefined, bukan null: schema memakai
    // `.optional()` yang menerima undefined tapi menolak null. Versi null
    // membuat seluruh form gagal dengan pesan Inggris yang membingungkan
    // setiap kali field opsional dikosongkan.
    deviceBrand: values.deviceBrand || undefined,
    deviceModel: values.deviceModel || undefined,
    problemDescription: values.problemDescription,
    address: values.address || undefined,
    preferredSchedule: values.preferredSchedule || undefined,
    additionalNotes: values.additionalNotes || undefined,
  });

  if (!parsed.success) {
    return orderFormFromZod(parsed.error, values);
  }

  const rawSchedule = parsed.data.preferredSchedule;
  if (rawSchedule && Number.isNaN(Date.parse(rawSchedule))) {
    return orderFormError("Jadwal yang dipilih tidak valid.", values);
  }

  const supabase = await createClient();
  const orderId = crypto.randomUUID();

  const uploadResult = await uploadOrderPhotos(supabase, user.id, orderId, files);
  if (!uploadResult.ok) {
    return orderFormError(uploadResult.error, values);
  }

  const insertPayload = {
    id: orderId,
    customer_id: user.id,
    service_id: parsed.data.serviceId,
    device_type: parsed.data.deviceType,
    device_brand: parsed.data.deviceBrand || null,
    device_model: parsed.data.deviceModel || null,
    problem_description: parsed.data.problemDescription,
    address: parsed.data.address || null,
    preferred_schedule: rawSchedule ? new Date(rawSchedule).toISOString() : null,
    additional_notes: parsed.data.additionalNotes || null,
    status: "pending" as const,
  };

  let createdOrderId: string | null = null;

  for (let attempt = 0; attempt < ORDER_NUMBER_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase
      .from("service_orders")
      .insert({ ...insertPayload, order_number: buildOrderNumber() })
      .select("id")
      .single();

    if (!error && data) {
      createdOrderId = data.id;
      break;
    }

    if (error?.code === "23505") {
      continue;
    }

    await removeStoredPhotos(
      supabase,
      uploadResult.photos.map((photo) => photo.storage_path),
    );
    return orderFormError("Gagal membuat pesanan. Silakan coba lagi.", values);
  }

  if (!createdOrderId) {
    await removeStoredPhotos(
      supabase,
      uploadResult.photos.map((photo) => photo.storage_path),
    );
    return orderFormError(
      "Gagal membuat nomor pesanan unik. Silakan coba lagi.",
      values,
    );
  }

  if (uploadResult.photos.length > 0) {
    const metadata = await insertPhotoMetadata(
      supabase,
      createdOrderId as string,
      uploadResult.photos,
    );

    if (!metadata.ok) {
      // Pesanan sudah dibuat dan tidak bisa dihapus oleh customer (RLS), jadi
      // file storage dibersihkan lalu user diarahkan ke pesanan dengan
      // peringatan — bukan error, agar tidak terjadi submit ulang ganda.
      await removeStoredPhotos(
        supabase,
        uploadResult.photos.map((photo) => photo.storage_path),
      );

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/services");
      revalidatePath(`/dashboard/services/${createdOrderId}`);
      redirect(`/dashboard/services/${createdOrderId}?created=1&photoWarning=1`);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/services");
  revalidatePath(`/dashboard/services/${createdOrderId}`);
  redirect(`/dashboard/services/${createdOrderId}?created=1`);
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  if (isDemoMode()) {
    demoMarkNotificationRead(user.id, notificationId);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/notifications");
    return;
  }

  if (!hasSupabaseEnv) {
    return;
  }

  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
}

/**
 * Menandai seluruh notifikasi milik customer yang sedang login sebagai
 * sudah dibaca. Query dibatasi `user_id` supaya tidak mungkin menyentuh
 * notifikasi pengguna lain.
 */
export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  if (isDemoMode()) {
    demoMarkAllNotificationsRead(user.id);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/notifications");
    return;
  }

  if (!hasSupabaseEnv) {
    return;
  }

  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
}

export type ApproveOrderState = {
  ok: boolean;
  message: string;
};

/**
 * Persetujuan customer untuk melanjutkan pesanan dari waiting_approval ke
 * in_progress. Perubahan status, riwayat, dan notifikasi terjadi di database
 * melalui RPC approve_my_order.
 */
export async function approveMyOrderAction(
  _prev: ApproveOrderState | null,
  formData: FormData,
): Promise<ApproveOrderState> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Sesi tidak valid. Silakan masuk kembali." };
  }

  const orderId = formData.get("orderId");
  if (typeof orderId !== "string" || !orderId) {
    return { ok: false, message: "Pesanan tidak valid." };
  }

  // Mode demo: RPC diganti logika langsung dengan aturan yang sama —
  // hanya pesanan milik sendiri yang sedang waiting_approval.
  if (isDemoMode()) {
    const db = loadDb();
    const order = db.orders.find(
      (row) => row.id === orderId && row.customer_id === user.id,
    );
    if (!order || order.status !== "waiting_approval") {
      return {
        ok: false,
        message: "Pesanan ini tidak sedang menunggu persetujuan Anda.",
      };
    }
    order.status = "in_progress";
    order.updated_at = new Date().toISOString();
    demoAddHistory(
      db,
      orderId,
      "waiting_approval",
      "in_progress",
      "Customer menyetujui estimasi biaya.",
      user.id,
    );
    demoNotifyAdmins(
      db,
      "Estimasi Disetujui",
      `Customer menyetujui estimasi untuk pesanan ${order.order_number}.`,
      "order",
    );
    saveDb(db);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/services");
    revalidatePath(`/dashboard/services/${orderId}`);

    return {
      ok: true,
      message: "Terima kasih. Pesanan akan segera dikerjakan.",
    };
  }

  if (!hasSupabaseEnv) {
    return { ok: false, message: "Konfigurasi Supabase belum diatur." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_my_order", {
    p_order_id: orderId,
  });

  if (error) {
    return {
      ok: false,
      message: dbErrorMessage(error, "Gagal menyetujui pesanan."),
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/services");
  revalidatePath(`/dashboard/services/${orderId}`);

  return { ok: true, message: "Terima kasih. Pesanan akan segera dikerjakan." };
}