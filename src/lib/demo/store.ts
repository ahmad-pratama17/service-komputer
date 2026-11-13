import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import type {
  InvoicePaymentMethod,
  InvoicePaymentStatus,
  NotificationType,
  OrderStatus,
  ServiceCategory,
  UserRole,
} from "@/types";
import type { AiRole } from "@/types";

/**
 * Penyimpanan demo: satu file JSON di `data/demo-db.json`.
 *
 * Bentuknya disengaja meniru kolom tabel Supabase (snake_case) supaya fungsi
 * demo bisa mengembalikan tipe yang sama persis dengan fungsi aslinya.
 * Single-user lokal: baca-ubah-tulis per aksi sudah cukup, tidak perlu lock.
 */

export type DemoUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  password_salt: string;
  password_hash: string;
  created_at: string;
};

export type DemoService = {
  id: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  starting_price: number;
  estimated_duration: number;
  is_active: boolean;
  created_at: string;
};

export type DemoOrder = {
  id: string;
  order_number: string;
  customer_id: string;
  service_id: string | null;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  problem_description: string;
  address: string | null;
  preferred_schedule: string | null;
  additional_notes: string | null;
  status: OrderStatus;
  diagnosis: string | null;
  estimated_cost: number | null;
  final_cost: number | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DemoHistory = {
  id: string;
  order_id: string;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  note: string | null;
  changed_by: string | null;
  created_at: string;
};

export type DemoInvoice = {
  id: string;
  order_id: string;
  invoice_number: string;
  description: string;
  subtotal: number;
  total: number;
  payment_status: InvoicePaymentStatus;
  payment_method: InvoicePaymentMethod;
  due_at: string | null;
  issued_at: string;
  paid_at: string | null;
  created_at: string;
};

export type DemoPhoto = {
  id: string;
  order_id: string;
  storage_path: string;
  file_name: string;
  photo_type: "issue" | "result";
  created_at: string;
};

export type DemoNotification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
};

export type DemoChatMessage = {
  id: string;
  role: AiRole;
  message: string;
  created_at: string;
};

export type DemoDb = {
  version: 1;
  users: DemoUser[];
  services: DemoService[];
  orders: DemoOrder[];
  history: DemoHistory[];
  invoices: DemoInvoice[];
  photos: DemoPhoto[];
  notifications: DemoNotification[];
  conversations: Record<string, DemoChatMessage[]>;
  seq: { order: number; invoice: number };
};

const DB_FILE = join(process.cwd(), "data", "demo-db.json");

/**
 * ID seed memakai UUID valid (bukan `demo-...`) karena `createOrderSchema`
 * dan `orderStatusSchema` memvalidasi ID sebagai UUID — ID non-UUID akan
 * ditolak validasi persis seperti di produksi.
 */
export const DEMO_IDS = {
  admin: "10000000-0000-4000-8000-000000000001",
  siti: "10000000-0000-4000-8000-000000000002",
  andi: "10000000-0000-4000-8000-000000000003",
  teknisi: "10000000-0000-4000-8000-000000000004",
  svcRepair: "20000000-0000-4000-8000-000000000001",
  svcWindows: "20000000-0000-4000-8000-000000000002",
  svcSoftware: "20000000-0000-4000-8000-000000000003",
  svcNetwork: "20000000-0000-4000-8000-000000000004",
  svcSupport: "20000000-0000-4000-8000-000000000005",
  svcRecovery: "20000000-0000-4000-8000-000000000006",
  svcMaintenance: "20000000-0000-4000-8000-000000000007",
  order1: "30000000-0000-4000-8000-000000000001",
  order2: "30000000-0000-4000-8000-000000000002",
  order3: "30000000-0000-4000-8000-000000000003",
  order4: "30000000-0000-4000-8000-000000000004",
  inv1: "40000000-0000-4000-8000-000000000001",
  inv2: "40000000-0000-4000-8000-000000000002",
};

export function hashPassword(password: string, saltHex?: string): {
  salt: string;
  hash: string;
} {
  const salt = saltHex ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, Buffer.from(salt, "hex"), 64).toString(
    "hex",
  );
  return { salt, hash };
}

function daysAgoIso(days: number, hours = 0): string {
  return new Date(Date.now() - days * 86400000 - hours * 3600000).toISOString();
}

function orderNumber(date: Date, seq: number): string {
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  return `SRV-${ymd}-${String(seq).padStart(4, "0")}`;
}

/** Data awal: 4 akun, 7 layanan, 4 pesanan, 2 tagihan, notifikasi. */
function seedDb(): DemoDb {
  const now = new Date();

  const adminPw = hashPassword("Demo#Admin123");
  const custPw = hashPassword("Demo#Customer123");
  const teknisiPw = hashPassword("Demo#Teknisi123");

  const users: DemoUser[] = [
    {
      id: DEMO_IDS.admin,
      email: "admin@demo.test",
      name: "Budi Santoso",
      phone: "628123450001",
      role: "admin",
      password_salt: adminPw.salt,
      password_hash: adminPw.hash,
      created_at: daysAgoIso(30),
    },
    {
      id: DEMO_IDS.siti,
      email: "customer@demo.test",
      name: "Siti Rahayu",
      phone: "628123450002",
      role: "customer",
      password_salt: custPw.salt,
      password_hash: custPw.hash,
      created_at: daysAgoIso(20),
    },
    {
      id: DEMO_IDS.andi,
      email: "customer2@demo.test",
      name: "Andi Wijaya",
      phone: "628123450003",
      role: "customer",
      password_salt: custPw.salt,
      password_hash: custPw.hash,
      created_at: daysAgoIso(10),
    },
    {
      id: DEMO_IDS.teknisi,
      email: "teknisi@demo.test",
      name: "Dedi Kurniawan",
      phone: "628123450004",
      role: "teknisi",
      password_salt: teknisiPw.salt,
      password_hash: teknisiPw.hash,
      created_at: daysAgoIso(10),
    },
  ];

  const services: DemoService[] = [
    {
      id: DEMO_IDS.svcRepair,
      name: "Perbaikan Komputer / Laptop",
      description: "Diagnosa dan perbaikan hardware komponen PC atau laptop yang rusak.",
      category: "computer_repair",
      starting_price: 150000,
      estimated_duration: 3,
      is_active: true,
      created_at: daysAgoIso(30),
    },
    {
      id: DEMO_IDS.svcWindows,
      name: "Paket Instalasi Ulang Windows",
      description: "Instalasi ulang sistem operasi Windows beserta driver dan software dasar.",
      category: "software",
      starting_price: 100000,
      estimated_duration: 1,
      is_active: true,
      created_at: daysAgoIso(30),
    },
    {
      id: DEMO_IDS.svcSoftware,
      name: "Instalasi Software & Aplikasi",
      description: "Instalasi aplikasi, antivirus, dan konfigurasi software sesuai kebutuhan.",
      category: "software",
      starting_price: 75000,
      estimated_duration: 1,
      is_active: true,
      created_at: daysAgoIso(30),
    },
    {
      id: DEMO_IDS.svcNetwork,
      name: "Setup Jaringan & WiFi",
      description: "Instalasi dan konfigurasi jaringan, router, WiFi, serta troubleshooting koneksi.",
      category: "network",
      starting_price: 200000,
      estimated_duration: 2,
      is_active: true,
      created_at: daysAgoIso(30),
    },
    {
      id: DEMO_IDS.svcSupport,
      name: "IT Support Harian",
      description: "Pendampingan dan dukungan IT untuk kantor maupun perorangan.",
      category: "it_support",
      starting_price: 250000,
      estimated_duration: 1,
      is_active: true,
      created_at: daysAgoIso(30),
    },
    {
      id: DEMO_IDS.svcRecovery,
      name: "Penyelamatan Data (Data Recovery)",
      description: "Pemulihan data dari hardisk/SSD yang rusak atau tidak terbaca.",
      category: "data_recovery",
      starting_price: 350000,
      estimated_duration: 5,
      is_active: true,
      created_at: daysAgoIso(30),
    },
    {
      id: DEMO_IDS.svcMaintenance,
      name: "Perawatan & Pembersihan (Maintenance)",
      description: "Pembersihan fisik, penggantian thermal paste, dan optimasi performa.",
      category: "maintenance",
      starting_price: 125000,
      estimated_duration: 1,
      is_active: true,
      created_at: daysAgoIso(30),
    },
  ];

  const mkOrder = (
    id: string,
    seq: number,
    days: number,
    partial: Partial<DemoOrder> & { customer_id: string },
  ): DemoOrder => {
    const created = new Date(now.getTime() - days * 86400000);
    return {
      id,
      order_number: orderNumber(created, seq),
      service_id: null,
      device_type: "Laptop",
      device_brand: null,
      device_model: null,
      problem_description: "",
      address: null,
      preferred_schedule: null,
      additional_notes: null,
      status: "pending",
      diagnosis: null,
      estimated_cost: null,
      final_cost: null,
      admin_notes: null,
      created_at: created.toISOString(),
      updated_at: created.toISOString(),
      ...partial,
    };
  };

  const orders: DemoOrder[] = [
    // Pesanan baru masuk — untuk menguji alur admin memproses.
    mkOrder(DEMO_IDS.order1, 1, 0, {
      customer_id: DEMO_IDS.siti,
      service_id: DEMO_IDS.svcRepair,
      device_brand: "ASUS",
      device_model: "VivoBook 14",
      problem_description:
        "Perangkat sangat lambat saat menyalakan, sering freeze dan harus di-restart beberapa kali.",
      address: "Jl. Contoh No. 10, Jakarta Selatan",
    }),
    // Sudah selesai dan lunas.
    mkOrder(DEMO_IDS.order2, 2, 6, {
      customer_id: DEMO_IDS.siti,
      service_id: DEMO_IDS.svcWindows,
      device_brand: "Lenovo",
      device_model: "ThinkPad E14",
      problem_description:
        "Sistem lambat dan sering error blue screen saat dipakai kerja.",
      status: "paid",
      diagnosis: "SSD terfragmentasi dan Windows perlu reinstallasi.",
      estimated_cost: 450000,
      final_cost: 425000,
      admin_notes: "Pelanggan minta dikabari kalau selesai.",
    }),
    // Menunggu persetujuan customer — untuk menguji tombol setuju.
    mkOrder(DEMO_IDS.order3, 3, 2, {
      customer_id: DEMO_IDS.siti,
      service_id: DEMO_IDS.svcNetwork,
      device_type: "Router",
      device_brand: "TP-Link",
      device_model: "Archer C6",
      problem_description:
        "WiFi sering putus-nyambung di lantai dua, terutama malam hari.",
      status: "waiting_approval",
      diagnosis: "Kemungkinan komponen WiFi dropout, perlu ganti antena.",
      estimated_cost: 275000,
    }),
    // Selesai, tagihan terbit tapi belum dibayar (milik Andi).
    mkOrder(DEMO_IDS.order4, 4, 1, {
      customer_id: DEMO_IDS.andi,
      service_id: DEMO_IDS.svcRepair,
      device_type: "PC Desktop",
      device_brand: "ASUS",
      device_model: "Xavier",
      problem_description:
        "PC sering mati sendiri saat sedang digunakan, diduga overheat pada CPU.",
      status: "completed",
      diagnosis: "Thermal paste kering dan kipas CPU berdebu. Sudah dibersihkan.",
      estimated_cost: 350000,
      final_cost: 325000,
    }),
  ];

  const history: DemoHistory[] = [
    {
      id: "50000000-0000-4000-8000-000000000001",
      order_id: DEMO_IDS.order1,
      old_status: null,
      new_status: "pending",
      note: "Pesanan diterima.",
      changed_by: null,
      created_at: orders[0].created_at,
    },
    {
      id: "50000000-0000-4000-8000-000000000002",
      order_id: DEMO_IDS.order2,
      old_status: null,
      new_status: "pending",
      note: "Pesanan diterima.",
      changed_by: null,
      created_at: orders[1].created_at,
    },
    {
      id: "50000000-0000-4000-8000-000000000003",
      order_id: DEMO_IDS.order2,
      old_status: "in_progress",
      new_status: "completed",
      note: "Pengerjaan selesai.",
      changed_by: DEMO_IDS.admin,
      created_at: daysAgoIso(2),
    },
    {
      id: "50000000-0000-4000-8000-000000000004",
      order_id: DEMO_IDS.order2,
      old_status: "completed",
      new_status: "paid",
      note: "Pembayaran dikonfirmasi.",
      changed_by: DEMO_IDS.admin,
      created_at: daysAgoIso(1),
    },
    {
      id: "50000000-0000-4000-8000-000000000005",
      order_id: DEMO_IDS.order3,
      old_status: null,
      new_status: "pending",
      note: "Pesanan diterima.",
      changed_by: null,
      created_at: orders[2].created_at,
    },
    {
      id: "50000000-0000-4000-8000-000000000006",
      order_id: DEMO_IDS.order3,
      old_status: "diagnosis",
      new_status: "waiting_approval",
      note: "Estimasi biaya menunggu persetujuan.",
      changed_by: DEMO_IDS.admin,
      created_at: daysAgoIso(1),
    },
    {
      id: "50000000-0000-4000-8000-000000000007",
      order_id: DEMO_IDS.order4,
      old_status: null,
      new_status: "pending",
      note: "Pesanan diterima.",
      changed_by: null,
      created_at: orders[3].created_at,
    },
    {
      id: "50000000-0000-4000-8000-000000000008",
      order_id: DEMO_IDS.order4,
      old_status: "in_progress",
      new_status: "completed",
      note: "Pengerjaan selesai.",
      changed_by: DEMO_IDS.admin,
      created_at: daysAgoIso(0, 5),
    },
  ];

  const year = now.getFullYear();
  const invoices: DemoInvoice[] = [
    {
      id: DEMO_IDS.inv1,
      order_id: DEMO_IDS.order2,
      invoice_number: `INV-${year}-0001`,
      description: "Perbaikan laptop dan reinstalasi sistem operasi.",
      subtotal: 425000,
      total: 425000,
      payment_status: "paid",
      payment_method: "manual",
      due_at: daysAgoIso(0),
      issued_at: daysAgoIso(6),
      paid_at: daysAgoIso(4),
      created_at: daysAgoIso(6),
    },
    {
      id: DEMO_IDS.inv2,
      order_id: DEMO_IDS.order4,
      invoice_number: `INV-${year}-0002`,
      description: "Perbaikan PC desktop dan pembersihan komponen.",
      subtotal: 325000,
      total: 325000,
      payment_status: "unpaid",
      payment_method: "manual",
      due_at: new Date(Date.now() + 6 * 86400000).toISOString(),
      issued_at: daysAgoIso(1),
      paid_at: null,
      created_at: daysAgoIso(1),
    },
  ];

  const notifications: DemoNotification[] = [
    {
      id: "60000000-0000-4000-8000-000000000001",
      user_id: DEMO_IDS.admin,
      title: "Pesanan Baru",
      message: `Pesanan ${orders[0].order_number} dari Siti Rahayu menunggu diproses.`,
      type: "order",
      is_read: false,
      created_at: orders[0].created_at,
    },
    {
      id: "60000000-0000-4000-8000-000000000002",
      user_id: DEMO_IDS.siti,
      title: "Menunggu Persetujuan",
      message: `Estimasi biaya ${orders[2].order_number} sebesar Rp275.000 menunggu persetujuan Anda.`,
      type: "order",
      is_read: false,
      created_at: daysAgoIso(1),
    },
    {
      id: "60000000-0000-4000-8000-000000000003",
      user_id: DEMO_IDS.siti,
      title: "Pembayaran Diterima",
      message: `Pembayaran ${invoices[0].invoice_number} sudah kami terima. Terima kasih.`,
      type: "payment",
      is_read: true,
      created_at: daysAgoIso(4),
    },
    {
      id: "60000000-0000-4000-8000-000000000004",
      user_id: DEMO_IDS.andi,
      title: "Tagihan Baru",
      message: `Tagihan ${invoices[1].invoice_number} sebesar Rp325.000 sudah terbit.`,
      type: "invoice",
      is_read: false,
      created_at: daysAgoIso(1),
    },
  ];

  return {
    version: 1,
    users,
    services,
    orders,
    history,
    invoices,
    photos: [],
    notifications,
    conversations: {},
    seq: { order: 5, invoice: 3 },
  };
}

function readDb(): DemoDb | null {
  try {
    if (!existsSync(DB_FILE)) {
      return null;
    }
    const parsed = JSON.parse(readFileSync(DB_FILE, "utf8")) as DemoDb;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.users)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Muat database demo; buat dari seed bila file belum ada atau rusak. */
export function loadDb(): DemoDb {
  const existing = readDb();
  if (existing) {
    return existing;
  }
  const seeded = seedDb();
  saveDb(seeded);
  return seeded;
}

export function saveDb(db: DemoDb): void {
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

/** Hapus file dan buat ulang dari seed. Dipakai tombol reset bila ada. */
export function resetDb(): DemoDb {
  const seeded = seedDb();
  saveDb(seeded);
  return seeded;
}
