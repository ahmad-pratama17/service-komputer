"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/session";
import {
  invoiceInputSchema,
  invoicePaymentSchema,
  orderDetailsSchema,
  orderStatusSchema,
  serviceInputSchema,
  validateOrderPhotos,
  verifyPhotoSignatures,
} from "@/lib/validations/order";
import {
  deleteOrderPhoto,
  insertPhotoMetadata,
  removeStoredPhotos,
  uploadOrderPhotos,
} from "@/lib/order-photos";
import { canTransition } from "@/lib/order-status";
import { dbErrorMessage } from "@/lib/db-errors";
import { isDemoMode } from "@/lib/demo/mode";
import {
  demoAddHistory,
  demoBuildInvoiceNumber,
  demoMarkAllNotificationsRead,
  demoNotify,
  demoSetInvoicePayment,
} from "@/lib/demo/mutations";
import { loadDb, saveDb } from "@/lib/demo/store";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export type AdminActionState = {
  ok: boolean;
  message: string;
};

const AUTH_ERROR = "Sesi admin tidak valid. Silakan masuk kembali.";
const FORBIDDEN = "Anda tidak memiliki akses ke tindakan ini.";
const INVOICE_NUMBER_ATTEMPTS = 5;

async function requireAdminAction(): Promise<
  { ok: true; user: SessionUser } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: AUTH_ERROR };
  }
  if (user.role !== "admin") {
    return { ok: false, error: FORBIDDEN };
  }
  return { ok: true, user };
}

/**
 * Gerbang tindakan operasional staf (admin + teknisi): ubah status pesanan,
 * tulis diagnosis, kelola foto hasil, AI Copilot, dan notifikasi sendiri.
 * Keuangan (tagihan) dan data master (layanan) tetap memakai
 * requireAdminAction.
 */
async function requireStaffAction(): Promise<
  { ok: true; user: SessionUser } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: AUTH_ERROR };
  }
  if (user.role !== "admin" && user.role !== "teknisi") {
    return { ok: false, error: FORBIDDEN };
  }
  return { ok: true, user };
}

async function revalidateOrderViews(orderId: string): Promise<void> {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/invoices");
  revalidatePath(`/teknisi/orders/${orderId}`);
  revalidatePath("/teknisi/orders");
  revalidatePath("/teknisi");
  revalidatePath("/dashboard/services");
  revalidatePath(`/dashboard/services/${orderId}`);
}

/**
 * Status berubah lewat RPC agar validasi transisi, riwayat, catatan, dan
 * notifikasi customer terjadi dalam satu transaksi di database.
 */
export async function updateOrderStatusAction(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) {
    return { ok: false, message: auth.error };
  }

  const parsed = orderStatusSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, message: "Permintaan tidak valid." };
  }

  const { orderId, status, note } = parsed.data;

  // Mode demo: RPC diganti penulisan langsung dengan aturan yang sama.
  if (isDemoMode()) {
    const db = loadDb();
    const order = db.orders.find((row) => row.id === orderId);
    if (!order) {
      return { ok: false, message: "Pesanan tidak ditemukan." };
    }
    if (order.status === status) {
      return { ok: false, message: "Status pesanan sudah sama." };
    }
    if (!canTransition(order.status, status)) {
      return {
        ok: false,
        message: `Status tidak dapat diubah ke "${status}" dari posisi saat ini.`,
      };
    }
    const oldStatus = order.status;
    order.status = status;
    order.updated_at = new Date().toISOString();
    demoAddHistory(db, orderId, oldStatus, status, note?.trim() || null, auth.user.id);
    demoNotify(
      db,
      order.customer_id,
      "Status Pesanan",
      `Status pesanan ${order.order_number} berubah menjadi "${ORDER_STATUS_LABEL[status]}".`,
      "order",
    );
    saveDb(db);
    await revalidateOrderViews(orderId);
    return { ok: true, message: "Status pesanan berhasil diperbarui." };
  }

  const supabase = await createClient();
  const { data: order, error: orderError } = await supabase
    .from("service_orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }

  if (order.status === status) {
    return { ok: false, message: "Status pesanan sudah sama." };
  }

  if (!canTransition(order.status, status)) {
    return {
      ok: false,
      message: `Status tidak dapat diubah ke "${status}" dari posisi saat ini.`,
    };
  }

  const { error } = await supabase.rpc("admin_update_order_status", {
    p_order_id: orderId,
    p_status: status as OrderStatus,
    p_note: note?.trim() || null,
  });

  if (error) {
    return {
      ok: false,
      message: dbErrorMessage(error, "Gagal memperbarui status pesanan."),
    };
  }

  await revalidateOrderViews(orderId);

  return { ok: true, message: "Status pesanan berhasil diperbarui." };
}

export async function updateOrderDetailsAction(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) {
    return { ok: false, message: auth.error };
  }

  const parsed = orderDetailsSchema.safeParse({
    orderId: formData.get("orderId"),
    diagnosis: formData.get("diagnosis") ?? "",
    estimatedCost: formData.get("estimatedCost") ?? "",
    finalCost: formData.get("finalCost") ?? "",
    adminNotes: formData.get("adminNotes") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  const { orderId, diagnosis } = parsed.data;

  // Teknisi hanya boleh menulis diagnosis. Biaya dan catatan internal
  // diabaikan di server (bukan hanya disembunyikan di UI) supaya peran
  // "lihat saja" untuk keuangan benar-benar ditegakkan.
  const isTechnician = auth.user.role === "teknisi";
  const estimatedCost = isTechnician ? undefined : parsed.data.estimatedCost;
  const finalCost = isTechnician ? undefined : parsed.data.finalCost;
  const adminNotes = isTechnician ? undefined : parsed.data.adminNotes;

  if (isDemoMode()) {
    const db = loadDb();
    const order = db.orders.find((row) => row.id === orderId);
    if (!order) {
      return { ok: false, message: "Pesanan tidak ditemukan." };
    }
    order.diagnosis = diagnosis?.trim() || null;
    if (!isTechnician) {
      order.estimated_cost =
        estimatedCost === "" || estimatedCost === undefined
          ? null
          : estimatedCost;
      order.final_cost =
        finalCost === "" || finalCost === undefined ? null : finalCost;
      order.admin_notes = adminNotes?.trim() || null;
    }
    order.updated_at = new Date().toISOString();
    demoNotify(
      db,
      order.customer_id,
      "Detail Pesanan",
      `Teknisi memperbarui diagnosis untuk pesanan ${order.order_number}.`,
      "order",
    );
    saveDb(db);
    await revalidateOrderViews(orderId);
    return { ok: true, message: "Detail pesanan berhasil disimpan." };
  }

  const supabase = await createClient();

  // Teknisi tidak mengirim biaya/catatan internal: teruskan nilai yang sudah
  // ada supaya RPC tidak menimpa (null-kan) data keuangan milik admin.
  let preservedCosts: {
    estimated_cost: number | null;
    final_cost: number | null;
    admin_notes: string | null;
  } | null = null;
  if (isTechnician) {
    const { data: current } = await supabase
      .from("service_orders")
      .select("estimated_cost, final_cost, admin_notes")
      .eq("id", orderId)
      .maybeSingle();
    if (!current) {
      return { ok: false, message: "Pesanan tidak ditemukan." };
    }
    preservedCosts = current;
  }

  const { error } = await supabase.rpc("admin_update_order_details", {
    p_order_id: orderId,
    p_diagnosis: diagnosis?.trim() || null,
    p_estimated_cost:
      preservedCosts?.estimated_cost ??
      (estimatedCost === "" || estimatedCost === undefined
        ? null
        : estimatedCost),
    p_final_cost:
      preservedCosts?.final_cost ??
      (finalCost === "" || finalCost === undefined ? null : finalCost),
    p_admin_notes: preservedCosts
      ? preservedCosts.admin_notes
      : adminNotes?.trim() || null,
  });

  if (error) {
    return {
      ok: false,
      message: dbErrorMessage(error, "Gagal menyimpan detail pesanan."),
    };
  }

  await revalidateOrderViews(orderId);

  return { ok: true, message: "Detail pesanan berhasil disimpan." };
}

export async function uploadResultPhotosAction(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) {
    return { ok: false, message: auth.error };
  }

  const orderId = formData.get("orderId");
  if (typeof orderId !== "string" || !orderId) {
    return { ok: false, message: "Pesanan tidak valid." };
  }

  const files = formData
    .getAll("resultPhotos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return { ok: false, message: "Pilih minimal satu foto hasil." };
  }

  const photosCheck = validateOrderPhotos(files);
  if (!photosCheck.ok) {
    return { ok: false, message: photosCheck.error };
  }

  // Header Content-Type bisa dipalsukan, jadi isi filenya ikut diperiksa.
  const signatureCheck = await verifyPhotoSignatures(files);
  if (!signatureCheck.ok) {
    return { ok: false, message: signatureCheck.error };
  }

  // Mode demo: tidak ada storage, jadi hanya metadata yang dicatat dan
  // galeri menampilkan placeholder. Batas 4 foto tetap ditegakkan.
  if (isDemoMode()) {
    const db = loadDb();
    const order = db.orders.find((row) => row.id === orderId);
    if (!order) {
      return { ok: false, message: "Pesanan tidak ditemukan." };
    }
    const existingCount = db.photos.filter(
      (row) => row.order_id === orderId && row.photo_type === "result",
    ).length;
    if (existingCount + files.length > 4) {
      return {
        ok: false,
        message: `Maksimal 4 foto hasil. Saat ini sudah ada ${existingCount} foto.`,
      };
    }
    const now = new Date().toISOString();
    for (const file of files) {
      db.photos.push({
        id: `demo-photo-${crypto.randomUUID()}`,
        order_id: orderId,
        storage_path: `demo/${orderId}/${file.name}`,
        file_name: file.name,
        photo_type: "result",
        created_at: now,
      });
    }
    saveDb(db);
    await revalidateOrderViews(orderId);
    return {
      ok: true,
      message: `${files.length} foto hasil dicatat (mode demo: tanpa file asli).`,
    };
  }

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("service_orders")
    .select("id, customer_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }

  const { data: existing } = await supabase
    .from("service_order_photos")
    .select("id")
    .eq("order_id", orderId)
    .eq("photo_type", "result");

  const total = (existing?.length ?? 0) + files.length;
  if (total > 4) {
    return {
      ok: false,
      message: `Maksimal 4 foto hasil. Saat ini sudah ada ${existing?.length ?? 0} foto.`,
    };
  }

  const uploadResult = await uploadOrderPhotos(
    supabase,
    order.customer_id,
    orderId,
    files,
    "result",
  );

  if (!uploadResult.ok) {
    return { ok: false, message: uploadResult.error };
  }

  const metadata = await insertPhotoMetadata(
    supabase,
    orderId,
    uploadResult.photos,
  );

  if (!metadata.ok) {
    await removeStoredPhotos(
      supabase,
      uploadResult.photos.map((photo) => photo.storage_path),
    );
    return { ok: false, message: metadata.error };
  }

  await revalidateOrderViews(orderId);

  return {
    ok: true,
    message: `${uploadResult.photos.length} foto hasil berhasil diunggah.`,
  };
}

export async function deleteResultPhotoAction(formData: FormData): Promise<void> {
  const auth = await requireStaffAction();
  if (!auth.ok) {
    return;
  }

  const photoId = formData.get("photoId");
  if (typeof photoId !== "string" || !photoId) {
    return;
  }

  if (isDemoMode()) {
    const db = loadDb();
    const photo = db.photos.find(
      (row) => row.id === photoId && row.photo_type === "result",
    );
    if (!photo) {
      return;
    }
    db.photos = db.photos.filter((row) => row.id !== photoId);
    saveDb(db);
    await revalidateOrderViews(photo.order_id);
    return;
  }

  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("service_order_photos")
    .select("id, storage_path, order_id, photo_type")
    .eq("id", photoId)
    .eq("photo_type", "result")
    .maybeSingle();

  if (!photo) {
    return;
  }

  await deleteOrderPhoto(supabase, photo);
  await revalidateOrderViews(photo.order_id);
}

function buildInvoiceNumber(date: Date = new Date()): string {
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `INV-${ymd}-${suffix}`;
}

export async function createInvoiceAction(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await requireAdminAction();
  if (!auth.ok) {
    return { ok: false, message: auth.error };
  }

  const parsed = invoiceInputSchema.safeParse({
    orderId: formData.get("orderId"),
    description: formData.get("description"),
    subtotal: formData.get("subtotal"),
    total: formData.get("total"),
    dueAt: formData.get("dueAt") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tagihan tidak valid.",
    };
  }

  const { orderId, description, subtotal, total, dueAt } = parsed.data;

  if (isDemoMode()) {
    const db = loadDb();
    const order = db.orders.find((row) => row.id === orderId);
    if (!order) {
      return { ok: false, message: "Pesanan tidak ditemukan." };
    }
    if (db.invoices.some((row) => row.order_id === orderId)) {
      return {
        ok: false,
        message: "Pesanan ini sudah memiliki tagihan.",
      };
    }
    const now = new Date().toISOString();
    const invoiceNumber = demoBuildInvoiceNumber();
    db.invoices.push({
      id: `demo-inv-${crypto.randomUUID()}`,
      order_id: orderId,
      invoice_number: invoiceNumber,
      description,
      subtotal,
      total,
      payment_status: "unpaid",
      payment_method: "manual",
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      issued_at: now,
      paid_at: null,
      created_at: now,
    });
    demoNotify(
      db,
      order.customer_id,
      "Tagihan Baru",
      `Tagihan ${invoiceNumber} sebesar ${formatCurrency(total)} untuk pesanan ${order.order_number} sudah terbit.`,
      "invoice",
    );
    saveDb(db);
    await revalidateOrderViews(orderId);
    return { ok: true, message: "Tagihan berhasil dibuat." };
  }

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("service_orders")
    .select("id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }

  // maybeSingle() sengaja dipakai apa adanya: bila karena satu dan lain hal
  // order punya lebih dari satu tagihan, fungsi ini mengembalikan error
  // alih-alih diam-diam memakai tagihan pertama. Index unik di migration
  // 00008 menutup jalur duplikasi ini di level database.
  const { data: existing, error: existingError } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingError) {
    return {
      ok: false,
      message: "Pesanan ini memiliki lebih dari satu tagihan. Perbaiki datanya dulu.",
    };
  }

  if (existing) {
    return {
      ok: false,
      message: `Pesanan ini sudah memiliki tagihan ${existing.invoice_number}.`,
    };
  }

  for (let attempt = 0; attempt < INVOICE_NUMBER_ATTEMPTS; attempt += 1) {
    const { error } = await supabase.from("invoices").insert({
      order_id: orderId,
      invoice_number: buildInvoiceNumber(),
      description,
      subtotal,
      total,
      payment_status: "unpaid",
      // MVP: pembayaran dicatat manual oleh admin, belum ada gateway.
      payment_method: "manual",
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    });

    if (!error) {
      await revalidateOrderViews(orderId);
      return { ok: true, message: "Tagihan berhasil dibuat." };
    }

    // Nomor tagihan bentrok: coba lagi dengan nomor baru.
    if (error.code === "23505") {
      continue;
    }

    return {
      ok: false,
      message: "Gagal membuat tagihan. Periksa kembali nominal dan deskripsi.",
    };
  }

  return { ok: false, message: "Gagal membuat nomor tagihan unik." };
}

export async function updateInvoicePaymentAction(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await requireAdminAction();
  if (!auth.ok) {
    return { ok: false, message: auth.error };
  }

  const parsed = invoicePaymentSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    paymentStatus: formData.get("paymentStatus"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Permintaan tidak valid." };
  }
  const { invoiceId, paymentStatus } = parsed.data;

  if (isDemoMode()) {
    const db = loadDb();
    const invoice = db.invoices.find((row) => row.id === invoiceId);
    if (!invoice) {
      return { ok: false, message: "Tagihan tidak ditemukan." };
    }
    if (invoice.payment_status === paymentStatus) {
      return { ok: false, message: "Status pembayaran sudah sama." };
    }
    const result = demoSetInvoicePayment(invoiceId, paymentStatus);
    if (!result.ok) {
      return { ok: false, message: "Gagal memperbarui status pembayaran." };
    }
    revalidatePath("/admin/invoices");
    revalidatePath("/admin");
    revalidatePath("/admin/orders/" + result.orderId);
    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/invoices/" + invoiceId);
    revalidatePath("/dashboard/services/" + result.orderId);
    return { ok: true, message: "Status pembayaran berhasil diperbarui." };
  }

  const supabase = await createClient();

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, order_id, payment_status")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceError || !invoice) {
    return { ok: false, message: "Tagihan tidak ditemukan." };
  }

  if (invoice.payment_status === paymentStatus) {
    return { ok: false, message: "Status pembayaran sudah sama." };
  }

  // paid_at hanya diisi saat lunas dan dikosongkan lagi kalau dibatalkan,
  // supaya tanggal pembayaran tidak pernah tidak sinkron dengan statusnya.
  const { error } = await supabase
    .from("invoices")
    .update({
      payment_status: paymentStatus,
      paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", invoiceId);

  if (error) {
    return { ok: false, message: "Gagal memperbarui status pembayaran." };
  }

  revalidatePath("/admin/invoices");
  revalidatePath("/admin");
  revalidatePath("/admin/orders/" + invoice.order_id);
  // Halaman customer ikut disegarkan supaya status di sisi mereka langsung
  // sama dengan yang baru dikonfirmasi admin.
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/invoices/" + invoiceId);
  revalidatePath("/dashboard/services/" + invoice.order_id);

  return { ok: true, message: "Status pembayaran berhasil diperbarui." };
}

export async function upsertServiceAction(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await requireAdminAction();
  if (!auth.ok) {
    return { ok: false, message: auth.error };
  }

  const parsed = serviceInputSchema.safeParse({
    serviceId: formData.get("serviceId") ?? "",
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    category: formData.get("category"),
    startingPrice: formData.get("startingPrice"),
    estimatedDuration: formData.get("estimatedDuration"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { ok: false, message: "Data layanan tidak valid." };
  }

  const { serviceId, name, description, category, startingPrice, estimatedDuration, isActive } =
    parsed.data;

  if (isDemoMode()) {
    const db = loadDb();
    if (serviceId) {
      const service = db.services.find((row) => row.id === serviceId);
      if (!service) {
        return { ok: false, message: "Layanan tidak ditemukan." };
      }
      service.name = name;
      service.description = description?.trim() || null;
      service.category = category;
      service.starting_price = startingPrice;
      service.estimated_duration = estimatedDuration;
      service.is_active = isActive;
      saveDb(db);
      revalidatePath("/admin/services");
      revalidatePath("/services");
      return { ok: true, message: "Layanan berhasil diperbarui." };
    }
    db.services.push({
      id: `demo-svc-${crypto.randomUUID()}`,
      name,
      description: description?.trim() || null,
      category,
      starting_price: startingPrice,
      estimated_duration: estimatedDuration,
      is_active: isActive,
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    revalidatePath("/admin/services");
    revalidatePath("/services");
    redirect("/admin/services?created=1");
  }

  const supabase = await createClient();
  const payload = {
    name,
    description: description?.trim() || null,
    category,
    starting_price: startingPrice,
    estimated_duration: estimatedDuration,
    is_active: isActive,
  };

  if (serviceId) {
    const { error } = await supabase
      .from("services")
      .update(payload)
      .eq("id", serviceId);

    if (error) {
      return { ok: false, message: "Gagal memperbarui layanan." };
    }

    revalidatePath("/admin/services");
    revalidatePath("/services");
    return { ok: true, message: "Layanan berhasil diperbarui." };
  }

  const { error } = await supabase.from("services").insert(payload);

  if (error) {
    return { ok: false, message: "Gagal membuat layanan baru." };
  }

  revalidatePath("/admin/services");
  revalidatePath("/services");

  redirect("/admin/services?created=1");
}

export async function toggleServiceAction(formData: FormData): Promise<void> {
  const auth = await requireAdminAction();
  if (!auth.ok) {
    return;
  }

  const serviceId = formData.get("serviceId");
  if (typeof serviceId !== "string" || !serviceId) {
    return;
  }

  if (isDemoMode()) {
    const db = loadDb();
    const service = db.services.find((row) => row.id === serviceId);
    if (!service) {
      return;
    }
    service.is_active = !service.is_active;
    saveDb(db);
    revalidatePath("/admin/services");
    revalidatePath("/admin");
    revalidatePath("/services");
    return;
  }

  const supabase = await createClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, is_active")
    .eq("id", serviceId)
    .maybeSingle();

  if (!service) {
    return;
  }

  await supabase
    .from("services")
    .update({ is_active: !service.is_active })
    .eq("id", serviceId);

  revalidatePath("/admin/services");
  revalidatePath("/admin");
  revalidatePath("/services");
}

/**
 * Menandai notifikasi sebagai sudah dibaca.
 *
 * WAJIB selalu difilter `user_id` milik staf yang sedang login. Tanpa
 * filter itu, "tandai semua" akan menandai notifikasi milik orang lain ikut
 * terbaca karena policy staf/admin boleh mengubah baris notifikasi.
 */
export async function markAdminNotificationsReadAction(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) {
    return { ok: false, message: auth.error };
  }

  const notificationId = formData.get("notificationId");

  if (isDemoMode()) {
    if (typeof notificationId === "string" && notificationId) {
      const db = loadDb();
      const row = db.notifications.find(
        (item) => item.id === notificationId && item.user_id === auth.user.id,
      );
      if (row) {
        row.is_read = true;
        saveDb(db);
      }
    } else {
      demoMarkAllNotificationsRead(auth.user.id);
    }
    revalidatePath("/admin/notifications");
    revalidatePath("/admin");
    revalidatePath("/teknisi/notifications");
    revalidatePath("/teknisi");
    return { ok: true, message: "Notifikasi ditandai sudah dibaca." };
  }

  const supabase = await createClient();

  const query = supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", auth.user.id);

  if (typeof notificationId === "string" && notificationId) {
    const { error } = await query.eq("id", notificationId);

    if (error) {
      return { ok: false, message: "Gagal menandai notifikasi." };
    }
  } else {
    const { error } = await query.eq("is_read", false);

    if (error) {
      return { ok: false, message: "Gagal menandai notifikasi." };
    }
  }

  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
  revalidatePath("/teknisi/notifications");
  revalidatePath("/teknisi");

  return { ok: true, message: "Notifikasi ditandai sudah dibaca." };
}

/**
 * Memproses antrean notifikasi email/WhatsApp secara manual dari halaman
 * Notifikasi admin. Sama seperti yang dijalankan cron, tetapi dipicu lewat
 * tombol — berguna untuk pengujian dan untuk volume kecil tanpa scheduler.
 */
export async function drainOutboxAction(): Promise<AdminActionState> {
  const auth = await requireAdminAction();
  if (!auth.ok) {
    return { ok: false, message: auth.error };
  }

  const { drainPendingNotifications } = await import(
    "@/lib/notifications/dispatch"
  );
  const summary = await drainPendingNotifications();

  revalidatePath("/admin/notifications");

  if (summary.checked === 0) {
    return {
      ok: true,
      message:
        "Tidak ada antrean yang perlu diproses. (Tanpa kredensial kanal atau service-role key, antrean tetap pending.)",
    };
  }

  return {
    ok: true,
    message: `Antrean diproses: ${summary.delivered} terkirim, ${summary.failed} gagal, ${summary.skipped} dilewati dari ${summary.checked} baris.`,
  };
}
