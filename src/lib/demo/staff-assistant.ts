import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import {
  demoAdminCustomers,
  demoAdminInvoices,
  demoAdminOrderDetail,
  demoAdminOrders,
  demoAdminServices,
} from "@/lib/demo/queries";
import type { StaffAgentRole } from "@/lib/ai/staff-agent";

/**
 * Penjawab staf mode demo: aturan kata kunci di atas store lokal.
 *
 * Sama seperti asisten customer versi demo, ini BUKAN model bahasa. Batas
 * perannya disamakan dengan agen asli: teknisi tidak mendapat angka
 * keuangan agregat dan instruksi pemakaiannya sama (kirim, tunggu, baca).
 */

const FINANCE_REFUSAL =
  "Data ringkasan keuangan (total terkumpul, total belum tertagih) hanya untuk admin. " +
  "Saya bisa menampilkan daftar tagihannya satu per satu, atau Anda bisa bertanya ke admin.";

function queueBlock(status: "pending" | null): string {
  const all = demoAdminOrders(status ? { status } : {});
  const rows = all.orders.slice(0, 8);
  if (rows.length === 0) {
    return status
      ? `Tidak ada pesanan berstatus ${ORDER_STATUS_LABEL[status]} saat ini.`
      : "Belum ada pesanan yang masuk.";
  }
  const lines = rows.map(
    (o) =>
      `- ${o.order_number}: ${o.customer_name} (${o.service_name ?? "tanpa layanan"}) — ${ORDER_STATUS_LABEL[o.status]}, dibuat ${formatDateTime(o.created_at)}`,
  );
  return [
    status
      ? `Pesanan berstatus ${ORDER_STATUS_LABEL[status]} (${all.total}):`
      : `Antrean pesanan terbaru (${all.total} total):`,
    ...lines,
  ].join("\n");
}

function invoiceBlock(unpaidOnly: boolean): string {
  const all = demoAdminInvoices();
  const rows = (unpaidOnly
    ? all.filter((i) => i.payment_status !== "paid")
    : all
  ).slice(0, 10);
  if (rows.length === 0) {
    return unpaidOnly
      ? "Semua tagihan sudah dibayar. Tidak ada yang menunggak."
      : "Belum ada tagihan.";
  }
  const lines = rows.map(
    (i) =>
      `- ${i.invoice_number} (${i.order_number}, ${i.customer_name}): ${formatCurrency(i.total)} — ${i.payment_status}`,
  );
  return [
    unpaidOnly ? "Tagihan yang belum dibayar:" : "Daftar tagihan:",
    ...lines,
  ].join("\n");
}

function financeBlock(): string {
  const all = demoAdminInvoices();
  const unpaid = all.filter((i) => i.payment_status !== "paid");
  const paid = all.filter((i) => i.payment_status === "paid");
  const sum = (rows: typeof all) =>
    rows.reduce((total, i) => total + i.total, 0);
  return [
    `Tagihan belum dibayar: ${unpaid.length} (${formatCurrency(sum(unpaid))}).`,
    `Total terkumpul: ${formatCurrency(sum(paid))}.`,
  ].join("\n");
}

function catalogBlock(): string {
  const services = demoAdminServices();
  const lines = services.map(
    (s) =>
      `- ${s.name} (mulai ${formatCurrency(s.starting_price)}${s.is_active ? "" : ", nonaktif"})`,
  );
  return ["Katalog layanan:", ...lines].join("\n");
}

function customerBlock(q: string): string {
  const term = q.trim().toLowerCase();
  const rows = demoAdminCustomers()
    .filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term),
    )
    .slice(0, 5);
  if (rows.length === 0) {
    return `Tidak ada pelanggan yang cocok dengan "${q}".`;
  }
  const lines = rows.map(
    (c) => `- ${c.name} (${c.email}${c.phone ? `, ${c.phone}` : ""}) — ${c.order_count} pesanan`,
  );
  return ["Pelanggan yang cocok:", ...lines].join("\n");
}

function orderBlock(ref: string): string {
  const term = ref.trim().toLowerCase();
  const found =
    demoAdminOrders().orders.find(
      (o) => o.order_number.toLowerCase() === term || o.id === term,
    ) ?? demoAdminOrders().orders[0];
  if (!found) {
    return "Belum ada pesanan.";
  }
  const got = demoAdminOrderDetail(found.id);
  if (!got.found) {
    return `Pesanan "${ref}" tidak ditemukan.`;
  }
  const o = got.detail.order;
  return [
    `Detail ${o.order_number}:`,
    `- Pelanggan: ${o.customer_name} (${o.customer_email})`,
    `- Status: ${ORDER_STATUS_LABEL[o.status]}`,
    `- Diagnosis: ${o.diagnosis ?? "belum ada"}`,
    `- Estimasi: ${o.estimated_cost !== null ? formatCurrency(o.estimated_cost) : "-"}`,
  ].join("\n");
}

export function demoStaffReply(role: StaffAgentRole, question: string): string {
  const q = question.toLowerCase();

  if (/total|terkumpul|tertagih|omzet|keuangan|revenue|pendapatan/.test(q)) {
    return role === "admin" ? financeBlock() : FINANCE_REFUSAL;
  }

  if (/tagihan|invoice|belum (di)?bayar|menunggak|nunggak/.test(q)) {
    return invoiceBlock(/belum|menunggak|nunggak/.test(q));
  }

  if (/pelanggan|customer|nama/.test(q)) {
    const m = q.match(/pelanggan(?: yang)? (?:bernama )?(.+)/);
    if (m) {
      return customerBlock(m[1]);
    }
    return 'Sebutkan nama atau emailnya, contoh: "cari pelanggan siti".';
  }

  if (/layanan|katalog|jasa|service/.test(q)) {
    return catalogBlock();
  }

  const orderRef = q.match(/srv-[0-9-]+/);
  if (orderRef || /detail|pesanan (itu|tersebut|nomor)/.test(q)) {
    return orderBlock(orderRef ? orderRef[0] : "");
  }

  if (/pending|baru (masuk|datang)|antre|antri|perlu dikerjakan|dikerjakan/.test(q)) {
    return queueBlock("pending");
  }

  if (/status|pengerjaan|progres/.test(q)) {
    return queueBlock(null);
  }

  if (/halo|hai|pagi|siang|sore|malam|help|bantuan|bisa apa/.test(q)) {
    return [
      role === "admin"
        ? "Halo! Saya bisa membantu memantau operasional lewat data."
        : "Halo! Saya bisa membantu pekerjaan lewat data pesanan.",
      "Contoh yang bisa ditanyakan:",
      "- Pesanan apa saja yang masih pending?",
      "- Tampilkan detail pesanan SRV-...",
      "- Tagihan apa saja yang belum dibayar?",
      role === "admin" ? "- Berapa total keuangan bulan ini?" : "",
      "- Cari pelanggan bernama ...",
      "- Layanan apa saja yang tersedia?",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Saya bisa membantu lewat data operasional. Coba tanyakan:",
    "- Pesanan apa saja yang masih pending?",
    "- Tampilkan detail pesanan SRV-...",
    "- Tagihan apa saja yang belum dibayar?",
    "- Cari pelanggan bernama ...",
  ].join("\n");
}
