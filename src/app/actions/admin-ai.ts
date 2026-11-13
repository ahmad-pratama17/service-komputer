"use server";

import { getAdminOrderAnalysisContext } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth/session";
import {
  analyzeOrderWithCopilot,
} from "@/lib/ai/admin-copilot";
import type { OrderAnalysis } from "@/lib/ai/copilot-shared";
import { checkAdminAnalysisRateLimit } from "@/lib/ai/rate-limit";
import { isDemoMode } from "@/lib/demo/mode";
import { demoAnalyzeOrder } from "@/lib/demo/copilot";
import { loadDb } from "@/lib/demo/store";

export type AdminAiState = {
  ok: boolean;
  message: string;
  analysis?: OrderAnalysis;
};

const AUTH_ERROR = "Sesi tidak valid. Silakan masuk kembali.";
const FORBIDDEN = "Hanya admin atau teknisi yang dapat menggunakan AI Copilot.";

/**
 * Menjalankan analisis AI untuk satu pesanan.
 *
 * Hal yang dijaga:
 * - orderId hanya dipakai untuk membaca data; klien tidak boleh mengirim
 *   konteks apa pun, sehingga tidak ada prompt injection dari browser.
 * - Tidak ada penulisan ke database dan tidak ada perubahan status maupun harga.
 * - Hasil hanya dikembalikan ke UI untuk ditinjau admin/technisi.
 */
export async function analyzeOrderWithAiAction(
  _prev: AdminAiState | null,
  formData: FormData,
): Promise<AdminAiState> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, message: AUTH_ERROR };
  }

  if (user.role !== "admin" && user.role !== "teknisi") {
    return { ok: false, message: FORBIDDEN };
  }

  const orderId = formData.get("orderId");

  if (typeof orderId !== "string" || !orderId) {
    return { ok: false, message: "Pesanan tidak valid." };
  }

  // Mode demo: tanpa API key. Analisis template dari data pesanan.
  if (isDemoMode()) {
    const db = loadDb();
    const order = db.orders.find((row) => row.id === orderId);
    if (!order) {
      return { ok: false, message: "Pesanan tidak ditemukan." };
    }
    const serviceName =
      db.services.find((service) => service.id === order.service_id)?.name ??
      null;
    const previousOrderCount = db.orders.filter(
      (row) => row.customer_id === order.customer_id && row.id !== orderId,
    ).length;
    return {
      ok: true,
      message: "Analisis demo selesai. Review sebelum dipakai.",
      analysis: demoAnalyzeOrder(order, serviceName, previousOrderCount),
    };
  }

  const limit = await checkAdminAnalysisRateLimit(user.id);

  if (!limit.ok) {
    return { ok: false, message: limit.error };
  }

  const context = await getAdminOrderAnalysisContext(orderId);

  if (!context.ok) {
    return { ok: false, message: context.error };
  }

  if (!context.data) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }

  const result = await analyzeOrderWithCopilot(context.data);

  if (!result.ok) {
    return { ok: false, message: result.error };
  }

  return {
    ok: true,
    message: "Analisis AI selesai. Review sebelum dipakai.",
    analysis: result.analysis,
  };
}