#!/usr/bin/env node
/**
 * Pembuat akun dan data demo untuk pengujian lokal.
 *
 * Script ini memakai service-role key, jadi MELALUI Row Level Security dan
 * menulis langsung ke database. HANYA untuk development lokal pada project
 * Supabase yang memang devoted untuk demo.
 *
 * Jangan pernah menjalankan script ini pada project production: akun demo
 * punya password yang diketahui publik.
 *
 * Prasyarat:
 *  1. Migration 00001 - 00010 sudah diterapkan (termasuk peran teknisi).
 *  2. .env.local berisi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY
 *     dengan nilai asli (bukan placeholder).
 *
 * Cara pakai:
 *   node scripts/seed-demo.mjs
 *   node scripts/seed-demo.mjs --reset     # hapus data demo lalu buat ulang
 *
 * Aman dijalankan berulang: akun yang sudah ada dilewati, bukan diduplikasi.
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// 1. Baca .env.local
// ---------------------------------------------------------------------------

/** Parser .env sederhana: tanpa dependensi tambahan. */
function parseEnvFile(path) {
  const out = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    // Buang tanda kutip pembungkus bila ada.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }
  return out;
}

const envPath = ".env.local";

if (!existsSync(envPath)) {
  console.error(`\n[!] ${envPath} tidak ditemukan.`);
  console.error("    Buat dulu:  cp .env.example .env.local\n");
  process.exit(1);
}

const fileEnv = parseEnvFile(envPath);

// Variabel yang sudah ada di environment proses menang agar bisa di-override.
const env = { ...fileEnv, ...process.env };

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

// ---------------------------------------------------------------------------
// 2. Validasi keras: jangan sampai jalan dengan placeholder
// ---------------------------------------------------------------------------

const PLACEHOLDER = /^(https?:\/\/)?(xxxx|<|\.\.\.|your|CHANGE|example)/i;

function requireReal(label, value, pattern) {
  if (!value) {
    console.error(`\n[!] ${label} belum diisi di ${envPath}.`);
    process.exit(1);
  }

  const looksPlaceholder =
    PLACEHOLDER.test(value) || /^\$\{/.test(value) || value.length < 20;

  if (looksPlaceholder) {
    console.error(`\n[!] ${label} masih berupa placeholder, bukan nilai asli.`);
    console.error(`    Nilai sekarang terlalu pendek / contoh: "${value.slice(0, 32)}"`);
    console.error("\n    Isi kredensial asli dari Supabase Dashboard:");
    console.error("      Project Settings -> API\n");
    process.exit(1);
  }

  if (pattern && !pattern.test(value)) {
    console.error(`\n[!] Format ${label} tidak sesuai yang diharapkan.`);
    console.error(`    Diawali: "${value.slice(0, 8)}..."\n`);
    process.exit(1);
  }
}

requireReal(
  "NEXT_PUBLIC_SUPABASE_URL",
  SUPABASE_URL,
  /^https:\/\/[a-z0-9]{15,}\.supabase\.co$/,
);
// Project baru memakai sb_secret_*, project lama memakai JWT (eyJ...).
// Keduanya diterima; yang penting bukan placeholder dan lolos uji ke server.
requireReal("SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE_KEY, /^(eyJ|sb_secret_)/);

// ---------------------------------------------------------------------------
// 3. Klien service-role
// ---------------------------------------------------------------------------

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const RESET = process.argv.includes("--reset");

// ---------------------------------------------------------------------------
// 4. Definisi akun demo
// ---------------------------------------------------------------------------

const ACCOUNTS = [
  {
    key: "admin",
    email: "admin@demo.test",
    password: "Demo#Admin123",
    name: "Budi Santoso",
    phone: "628123450001",
    role: "admin",
  },
  {
    key: "customer",
    email: "customer@demo.test",
    password: "Demo#Customer123",
    name: "Siti Rahayu",
    phone: "628123450002",
    role: "customer",
  },
  {
    key: "customer2",
    email: "customer2@demo.test",
    password: "Demo#Customer123",
    name: "Andi Wijaya",
    phone: "628123450003",
    role: "customer",
  },
  {
    key: "teknisi",
    email: "teknisi@demo.test",
    password: "Demo#Teknisi123",
    name: "Dedi Kurniawan",
    phone: "628123450004",
    role: "teknisi",
  },
];

// ---------------------------------------------------------------------------
// 5. Cek schema sudah siap
// ---------------------------------------------------------------------------

async function assertSchemaReady() {
  const { error } = await db.from("services").select("id").limit(1);

  if (error) {
    console.error("\n[!] Tabel `services` belum bisa diakses.");
    console.error(`    Error: ${error.message}`);
    console.error(
      "\n    Migration 00001-00010 belum diterapkan. Buka SQL Editor di",
    );
    console.error("    Supabase Dashboard lalu jalankan file satu per satu,");
    console.error("    berurutan dari 00001_init.sql.\n");
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// 6. Buat / perbarui akun
// ---------------------------------------------------------------------------

/**
 * Memastikan satu akun ada dengan role yang benar.
 * Memakai Admin API karena registrasi biasa selalu menghasilkan role customer.
 */
async function ensureAccount(account) {
  // Cari user yang sudah ada lewat daftar, lalu cari yang cocok.
  let existing = null;

  for (let page = 1; page <= 10 && !existing; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      console.error(`\n[!] Gagal membaca daftar user: ${error.message}\n`);
      process.exit(1);
    }

    existing = data.users.find((u) => u.email === account.email);
    if (data.users.length < 200) break;
  }

  if (existing) {
    // Password sengaja diset ulang agar demo selalu bisa login.
    const { error } = await db.auth.admin.updateUserById(existing.id, {
      password: account.password,
      email_confirm: true,
      user_metadata: { full_name: account.name, phone: account.phone },
    });

    if (error) {
      console.error(`\n[!] Gagal memperbarui ${account.email}: ${error.message}\n`);
      process.exit(1);
    }

    // Trigger handle_new_user sudah membuat baris profile. Pastikan sinkron.
    await syncProfile(existing.id, account);
    return { id: existing.id, created: false };
  }

  const { data, error } = await db.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { full_name: account.name, phone: account.phone },
  });

  if (error) {
    console.error(`\n[!] Gagal membuat ${account.email}: ${error.message}\n`);
    process.exit(1);
  }

  await syncProfile(data.user.id, account);
  return { id: data.user.id, created: true };
}

/** Menulis profile + role. Service-role melewati trigger anti-eskalasi. */
async function syncProfile(userId, account) {
  const { error } = await db
    .from("profiles")
    .update({
      email: account.email,
      name: account.name,
      phone: account.phone,
      role: account.role,
    })
    .eq("id", userId);

  if (error) {
    console.error(`\n[!] Gagal menulis profile ${account.email}: ${error.message}\n`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// 7. Data pesanan + tagihan demo
// ---------------------------------------------------------------------------

/** Nomor pesanan format SRV-YYYYMMDD-XXXX, sama seperti di aplikasi. */
function orderNumber(date, seq) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `SRV-${y}${m}${d}-${String(seq).padStart(4, "0")}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function getServiceIdByName() {
  const { data, error } = await db
    .from("services")
    .select("id, name")
    .order("id");

  if (error || !data?.length) {
    console.error("\n[!] Tidak bisa membaca tabel services.");
    console.error("    Jalankan migration 00002_seed.sql lebih dulu.\n");
    process.exit(1);
  }

  return data;
}

/**
 * Membuat satu pesanan. Memakai service-role sehingga trigger
 * enforce_customer_order_defaults TIDAK Menjalankan (trigger itu hanya
 * memaksa kolom admin bila auth.uid() ada), jadi status/biaya bisa diisi.
 */
async function createOrder({ customerId, service, seq, status, cost, days }) {
  const created = daysAgo(days);
  const number = orderNumber(created, seq);

  const { data, error } = await db
    .from("service_orders")
    .insert({
      order_number: number,
      customer_id: customerId,
      service_id: service.id,
      device_type: "Laptop",
      device_brand: service.category === "network" ? "TP-Link" : "ASUS",
      device_model: "VivoBook 14",
      problem_description:
        "Perangkat sangat lambat saat menyalakan, sering freeze dan harus di-restart beberapa kali.",
      address: "Jl. Contoh No. 10, Jakarta Selatan",
      status,
      diagnosis:
        status === "pending" ? null : "Hard drive lambat dan Cmd terfragmentasi.",
      estimated_cost: cost,
      final_cost: status === "completed" || status === "paid" ? cost - 25000 : null,
      admin_notes:
        status === "pending" ? null : "Pelanggan ingin dikabari bila selesai.",
      created_at: created.toISOString(),
      updated_at: created.toISOString(),
    })
    .select("id, order_number")
    .single();

  if (error) {
    console.error(`\n[!] Gagal membuat pesanan ${number}: ${error.message}\n`);
    process.exit(1);
  }

  return data;
}

async function createInvoice(orderId, number, total, status, days) {
  const issued = daysAgo(days);

  const { error } = await db.from("invoices").insert({
    order_id: orderId,
    invoice_number: number,
    description: "Perbaikan laptop dan optimizesasi sistem.",
    subtotal: total,
    total,
    payment_status: status,
    payment_method: "manual",
    issued_at: issued.toISOString(),
    due_at: new Date(issued.getTime() + 7 * 86400000).toISOString(),
    paid_at: status === "paid" ? daysAgo(Math.max(0, days - 2)).toISOString() : null,
  });

  if (error) {
    console.error(`\n[!] Gagal membuat invoice ${number}: ${error.message}\n`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// 8. Reset (opsional)
// ---------------------------------------------------------------------------

async function resetDemoData(customerIds) {
  console.log("  Menghapus data demo lama ...");

  // Urutan penting karena ada foreign key.
  const { data: demoOrders } = await db
    .from("service_orders")
    .select("id")
    .in("customer_id", customerIds);

  const orderIds = (demoOrders ?? []).map((o) => o.id);

  if (orderIds.length > 0) {
    await db.from("invoices").delete().in("order_id", orderIds);
    await db
      .from("service_order_photos")
      .delete()
      .in("order_id", orderIds);
    await db
      .from("order_status_history")
      .delete()
      .in("order_id", orderIds);
  }

  await db.from("service_orders").delete().in("customer_id", customerIds);

  // Notifikasi ikut terhapus lewat cascade dari profiles.
  await db.from("ai_conversations").delete().in("user_id", customerIds);
  await db.from("notifications").delete().in("user_id", customerIds);
}

// ---------------------------------------------------------------------------
// 9. Jalankan
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n=== Seed data demo Service Komputer ===\n");

  console.log("  Target  :", SUPABASE_URL);
  console.log("  Service role key: terpasang");
  console.log("");

  await assertSchemaReady();

  const services = await getServiceIdByName();
  console.log(`  Layanan tersedia: ${services.length}`);

  // --- akun ---
  console.log("\n  Membuat akun ...");
  const users = {};

  for (const account of ACCOUNTS) {
    const { id, created } = await ensureAccount(account);
    users[account.key] = id;
    console.log(
      `    ${created ? "+" : "="} ${account.email.padEnd(22)} ${account.role}`,
    );
  }

  const customerIds = [users.customer, users.customer2];

  if (RESET) {
    await resetDemoData(customerIds);
  }

  // --- pesanan ---
  const existingOrders = await db
    .from("service_orders")
    .select("id")
    .in("customer_id", customerIds);

  if ((existingOrders.data ?? []).length > 0 && !RESET) {
    console.log(
      `\n  Pesanan demo sudah ada (${existingOrders.data.length}). ` +
        "Pakai --reset untuk membuat ulang.",
    );
  } else {
    console.log("\n  Membuat pesanan & tagihan ...");

    const pick = (fragment) =>
      services.find((s) => s.name.toLowerCase().includes(fragment)) ?? services[0];

    const repair = pick("perbaikan");
    const windows = pick("windows");
    const network = pick("jaringan");

    // Pesanan 1 - baru masuk, untuk menguji alur admin memproses.
    await createOrder({
      customerId: users.customer,
      service: repair,
      seq: 1,
      status: "pending",
      cost: null,
      days: 0,
    });

    // Pesanan 2 - sudah selesai dan sudah dibayar.
    const done = await createOrder({
      customerId: users.customer,
      service: windows,
      seq: 2,
      status: "paid",
      cost: 450000,
      days: 6,
    });
    await createInvoice(done.id, "INV-2026-0001", 425000, "paid", 6);

    // Pesanan 3 - menunggu persetujuan customer.
    await createOrder({
      customerId: users.customer,
      service: network,
      seq: 3,
      status: "waiting_approval",
      cost: 275000,
      days: 2,
    });

    // Pesanan 4 - tagihan sudah terbit tapi belum dibayar.
    const unpaid = await createOrder({
      customerId: users.customer2,
      service: repair,
      seq: 4,
      status: "completed",
      cost: 350000,
      days: 1,
    });
    await createInvoice(unpaid.id, "INV-2026-0002", 325000, "unpaid", 1);

    console.log("    + 4 pesanan");
    console.log("    + 2 tagihan");
  }

  // --- ringkasan ---
  const orders = await db
    .from("service_orders")
    .select("id, status")
    .in("customer_id", customerIds);

  console.log(`\n  Total pesanan demo: ${orders.data?.length ?? 0}`);
  console.log("\n=== Selesai ===\n");
  console.log("  Akun demo:\n");
  console.log("    Admin     admin@demo.test        Demo#Admin123");
  console.log("    Customer  customer@demo.test     Demo#Customer123");
  console.log("    Customer2 customer2@demo.test    Demo#Customer123");
  console.log("    Teknisi   teknisi@demo.test      Demo#Teknisi123");
  console.log("\n  Login di http://localhost:3000/login");
  console.log("  Admin otomatis diarahkan ke /admin, customer ke /dashboard.\n");
}

main().catch((error) => {
  console.error("\n[!] Gagal menjalankan seed:");
  console.error(`    ${error.message}\n`);
  process.exit(1);
});