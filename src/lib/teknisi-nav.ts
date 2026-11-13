import type { AdminNavIcon, AdminNavEntry } from "@/types";

/**
 * Navigasi panel teknisi. Disengaja terpisah dari ADMIN_NAV_SECTIONS:
 * - Tidak ada menu Tagihan kelola, Layanan kelola, Pelanggan kelola, dan
 *   AI Copilot global — yang ada versi lihat-saja atau konteks per-pesanan.
 * - Ikon memakai ulang set AdminNavIcon supaya sidebar tidak perlu diubah.
 */
export const TEKNISI_NAV_SECTIONS: {
  heading: string;
  items: AdminNavEntry[];
}[] = [
  {
    heading: "Pekerjaan",
    items: [
      { href: "/teknisi", label: "Dashboard", icon: "orders" },
      { href: "/teknisi/orders", label: "Pesanan", icon: "orders" },
    ],
  },
  {
    heading: "Lihat Saja",
    items: [
      { href: "/teknisi/invoices", label: "Tagihan", icon: "invoices" },
      { href: "/teknisi/services", label: "Layanan", icon: "services" },
      {
        href: "/teknisi/notifications",
        label: "Notifikasi",
        icon: "notifications",
      },
    ],
  },
];

export type { AdminNavIcon, AdminNavEntry };
