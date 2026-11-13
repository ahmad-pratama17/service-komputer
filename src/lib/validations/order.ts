import { z } from "zod";
import {
  MAX_ORDER_PHOTOS,
  MAX_ORDER_PHOTO_BYTES,
  ORDER_PHOTO_MIME_TYPES,
} from "@/lib/constants";

export const createOrderSchema = z.object({
  serviceId: z.string().uuid("Pilih layanan terlebih dahulu"),
  deviceType: z
    .string()
    .min(2, "Jenis perangkat wajib diisi")
    .max(80, "Jenis perangkat terlalu panjang"),
  deviceBrand: z.string().max(80, "Merek terlalu panjang").optional(),
  deviceModel: z.string().max(80, "Model terlalu panjang").optional(),
  problemDescription: z
    .string()
    .min(10, "Deskripsi masalah minimal 10 karakter")
    .max(4000, "Deskripsi masalah maksimal 4000 karakter"),
  address: z.string().max(500, "Alamat terlalu panjang").optional(),
  preferredSchedule: z.string().optional(),
  additionalNotes: z.string().max(2000, "Catatan terlalu panjang").optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "pending",
    "accepted",
    "diagnosis",
    "waiting_approval",
    "in_progress",
    "completed",
    "paid",
    "closed",
    "cancelled",
  ]),
  note: z.string().optional(),
  estimatedCost: z.number().min(0).optional(),
  diagnosis: z.string().optional(),
});

export const orderStatusSchema = z.object({
  orderId: z.string().uuid("Pesanan tidak valid"),
  status: updateOrderStatusSchema.shape.status,
  note: z
    .string()
    .trim()
    .max(500, "Catatan transisi maksimal 500 karakter")
    .optional(),
});

export const orderDetailsSchema = z.object({
  orderId: z.string().uuid("Pesanan tidak valid"),
  diagnosis: z
    .string()
    .trim()
    .max(2000, "Diagnosis maksimal 2000 karakter")
    .optional(),
  estimatedCost: z
    .union([z.literal(""), z.coerce.number().min(0, "Estimasi biaya tidak boleh negatif")])
    .optional(),
  finalCost: z
    .union([z.literal(""), z.coerce.number().min(0, "Biaya final tidak boleh negatif")])
    .optional(),
  adminNotes: z
    .string()
    .trim()
    .max(2000, "Catatan admin maksimal 2000 karakter")
    .optional(),
});

export const invoiceInputSchema = z
  .object({
    orderId: z.string().uuid("Pesanan tidak valid"),
    description: z
      .string()
      .trim()
      .min(5, "Deskripsi minimal 5 karakter")
      .max(500, "Deskripsi terlalu panjang"),
    subtotal: z.coerce
      .number()
      .min(0, "Subtotal tidak boleh negatif")
      .max(1_000_000_000, "Subtotal terlalu besar"),
    total: z.coerce
      .number()
      .min(0, "Total tidak boleh negatif")
      .max(1_000_000_000, "Total terlalu besar"),
    dueAt: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => !value || !Number.isNaN(Date.parse(value)),
        "Tanggal jatuh tempo tidak valid",
      ),
  })
  .refine((value) => value.total >= value.subtotal, {
    message: "Total tidak boleh lebih kecil dari subtotal",
    path: ["total"],
  });

export const invoicePaymentSchema = z.object({
  invoiceId: z.string().uuid("Tagihan tidak valid"),
  paymentStatus: z.enum(["unpaid", "pending", "paid"], {
    message: "Status pembayaran tidak valid",
  }),
});

export const serviceInputSchema = z.object({
  serviceId: z.string().uuid("Layanan tidak valid").or(z.literal("")),
  name: z
    .string()
    .trim()
    .min(3, "Nama layanan minimal 3 karakter")
    .max(120, "Nama layanan terlalu panjang"),
  description: z.string().trim().max(1000, "Deskripsi terlalu panjang").optional(),
  category: z.enum(
    [
      "computer_repair",
      "network",
      "software",
      "it_support",
      "data_recovery",
      "maintenance",
    ],
    { message: "Kategori layanan tidak valid" },
  ),
  startingPrice: z.coerce
    .number()
    .min(0, "Harga tidak boleh negatif")
    .max(1_000_000_000, "Harga terlalu besar"),
  estimatedDuration: z.coerce
    .number()
    .min(1, "Estimasi durasi minimal 1 jam")
    .max(1000, "Estimasi durasi terlalu besar"),
  isActive: z.boolean(),
});

export type OrderStatusInput = z.infer<typeof orderStatusSchema>;
export type OrderDetailsInput = z.infer<typeof orderDetailsSchema>;
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;
export type InvoicePaymentInput = z.infer<typeof invoicePaymentSchema>;
export type ServiceInput = z.infer<typeof serviceInputSchema>;

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<
  typeof updateOrderStatusSchema
>;

export type OrderFormValues = Record<string, string>;

export type OrderFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: OrderFormValues;
};

export function orderFormError(
  message: string,
  values?: OrderFormValues,
): OrderFormState {
  return { status: "error", message, values };
}

export function orderFormFromZod(
  error: z.ZodError,
  values?: OrderFormValues,
): OrderFormState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return {
    status: "error",
    message: error.issues[0]?.message ?? "Data tidak valid.",
    fieldErrors,
    values,
  };
}

export function validateOrderPhotos(
  files: File[],
): { ok: true } | { ok: false; error: string } {
  if (files.length > MAX_ORDER_PHOTOS) {
    return {
      ok: false,
      error: `Maksimal ${MAX_ORDER_PHOTOS} foto yang dapat diunggah.`,
    };
  }

  for (const file of files) {
    if (!ORDER_PHOTO_MIME_TYPES.includes(file.type)) {
      return {
        ok: false,
        error: `Format foto tidak didukung (${file.name}). Gunakan JPG, PNG, WEBP, atau GIF.`,
      };
    }
    if (file.size > MAX_ORDER_PHOTO_BYTES) {
      return {
        ok: false,
        error: `Ukuran foto "${file.name}" melebihi batas ${Math.round(MAX_ORDER_PHOTO_BYTES / (1024 * 1024))}MB.`,
      };
    }
  }

  return { ok: true };
}

/**
 * Verifikasi signature biner file, bukan hanya `file.type`.
 *
 * `file.type` berasal dari header Content-Type kiriman browser dan bisa
 * dipalsukan. Bucket Supabase sudah membatasi `allowed_mime_types`, tapi itu
 * masih memercayai header yang sama — file HTML atau JS yang diberi nama
 * `foto.png` akan lolos. Signature biner di bawah membaca isi file apa adanya,
 * jadi mengganti nama file saja tidak cukup untuk menembus filter.
 */
const PHOTO_SIGNATURES: {
  mime: (typeof ORDER_PHOTO_MIME_TYPES)[number];
  matches: (bytes: Uint8Array) => boolean;
}[] = [
  {
    mime: "image/jpeg",
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    matches: (b) =>
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    mime: "image/gif",
    matches: (b) => ascii(b, 0, 3) === "GIF",
  },
  {
    mime: "image/webp",
    matches: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP",
  },
];

const SIGNATURE_BYTES = 12;

/** Membaca potongan byte sebagai teks ASCII untuk dibandingkan. */
function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = "";
  for (let i = offset; i < offset + length; i += 1) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

/**
 * Membaca signature file dan mencocokkannya dengan tipe yang diklaim.
 * File yang signature-nya tidak dikenal ditolak.
 */
export async function verifyPhotoSignatures(
  files: File[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const file of files) {
    let head: Uint8Array;

    try {
      head = new Uint8Array(await file.slice(0, SIGNATURE_BYTES).arrayBuffer());
    } catch {
      return { ok: false, error: `Foto "${file.name}" tidak dapat dibaca.` };
    }

    const matched = PHOTO_SIGNATURES.find((candidate) =>
      candidate.matches(head),
    );

    if (!matched || matched.mime !== file.type) {
      return {
        ok: false,
        error: `Isi file "${file.name}" tidak cocok dengan format gambarnya. Gunakan JPG, PNG, WEBP, atau GIF asli.`,
      };
    }
  }

  return { ok: true };
}

export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "foto";
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return cleaned.length > 0 ? cleaned.slice(0, 80) : "foto";
}