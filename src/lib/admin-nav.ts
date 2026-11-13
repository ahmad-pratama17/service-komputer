import type { AdminNavIcon, AdminNavEntry } from "@/types";

export const ADMIN_NAV_SECTIONS: { heading: string; items: AdminNavEntry[] }[] = [
  {
    heading: "Operasional",
    items: [
      { href: "/admin", label: "Dashboard", icon: "orders" },
      { href: "/admin/orders", label: "Pesanan", icon: "orders" },
      { href: "/admin/customers", label: "Pelanggan", icon: "customers" },
      { href: "/admin/services", label: "Layanan", icon: "services" },
    ],
  },
  {
    heading: "Keuangan & Sistem",
    items: [
      { href: "/admin/invoices", label: "Tagihan", icon: "invoices" },
      {
        href: "/admin/notifications",
        label: "Notifikasi",
        icon: "notifications",
      },
    ],
  },
];

export type { AdminNavIcon, AdminNavEntry };
