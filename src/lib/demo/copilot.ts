import type { OrderAnalysis } from "@/lib/ai/copilot-shared";
import { formatCurrency } from "@/lib/utils";
import type { DemoOrder } from "@/lib/demo/store";

/**
 * Analisis copilot mode demo: template deterministik dari data pesanan.
 *
 * BUKAN model bahasa. Tujuannya supaya tombol "Analisis dengan AI" di detail
 * pesanan bisa diuji ujung-ke-ujung (klik → hasil → salin) tanpa API key.
 * Teknisi tetap wajib me-review, sama seperti hasil AI asli.
 */

function causesFor(problem: string): string[] {
  const text = problem.toLowerCase();
  const causes: string[] = [];

  if (/lambat|lemot|lelet|freeze|hang|restart/.test(text)) {
    causes.push(
      "Penyimpanan (HDD/SSD) mulai lambat atau terfragmentasi",
      "Sistem operasi corrupt atau penuh startup program",
      "Overheat akibat debu atau thermal paste kering",
    );
  }
  if (/wifi|wi-fi|jaringan|internet|koneksi|router|putus|sinyal/.test(text)) {
    causes.push(
      "Interferensi kanal WiFi atau posisi router kurang ideal",
      "Router overheat atau firmware usang",
      "Kabel/konektor jaringan longgar",
    );
  }
  if (/hard\s?disk|hdd|ssd|data|tidak terbaca|hilang/.test(text)) {
    causes.push(
      "Bad sector atau controller penyimpanan bermasalah",
      "Kabel data/power longgar",
    );
  }
  if (/mati|tidak menyala|tidak hidup|blue\s?screen|bsod/.test(text)) {
    causes.push(
      "Power supply atau baterai bermasalah",
      "RAM longgar atau rusak",
      "Overheat CPU",
    );
  }
  if (causes.length === 0) {
    causes.push(
      "Perlu pemeriksaan langsung untuk memastikan penyebab",
      "Kemungkinan gabungan faktor hardware dan software",
    );
  }

  return causes;
}

export function demoAnalyzeOrder(
  order: DemoOrder,
  serviceName: string | null,
  previousCount: number,
): OrderAnalysis {
  const device = [order.device_type, order.device_brand, order.device_model]
    .filter(Boolean)
    .join(" ");

  const estimate =
    order.estimated_cost !== null
      ? formatCurrency(order.estimated_cost)
      : serviceName
        ? "menyesuaikan tarif layanan"
        : "ditentukan setelah diagnosa";

  return {
    problemSummary: `Pelanggan melaporkan masalah pada ${device || "perangkat"}: ${order.problem_description}`,
    possibleCauses: causesFor(order.problem_description),
    recommendedChecks: [
      "Catat gejala dan pola kemunculannya (kapan, seberapa sering)",
      "Cek suhu perangkat dan kondisi kipas saat beban kerja",
      "Uji dengan konfigurasi minimal untuk isolasi masalah",
      previousCount > 0
        ? `Bandingkan dengan ${previousCount} pesanan sebelumnya dari pelanggan ini`
        : "Belum ada riwayat pesanan sebelumnya dari pelanggan ini",
    ],
    suggestedService:
      serviceName ??
      "Pilih layanan setelah pemeriksaan awal menentukan kategori masalah",
    suggestedCustomerResponse: `Terima kasih atas laporannya. Keluhan Anda sudah kami catat dan teknisi akan memeriksa ${device || "perangkat"} Anda. Estimasi biaya ${estimate}. Kami akan menghubungi Anda sebelum pengerjaan dimulai.`,
  };
}
