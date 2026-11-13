import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { DEMO_SESSION_COOKIE } from "@/lib/demo/mode";
import { hashPassword, loadDb, type DemoUser } from "@/lib/demo/store";

/**
 * Auth mode demo: password memakai scrypt, session memakai cookie yang
 * ditandatangani HMAC. Tidak ada token acak yang disimpan di server, jadi
 * tidak ada tabel session dan tidak ada yang perlu di-rotate.
 *
 * Secret default hanya untuk lokal. Di mesin sendiri risikonya tidak ada;
 * kalau aplikasi ini di-deploy, matikan mode demo dengan mengisi env
 * Supabase (mode demo hanya aktif bila env kosong).
 */

const SECRET =
  process.env.DEMO_SECRET ?? "service-komputer-local-demo-secret";

function b64urlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function b64urlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): boolean {
  try {
    const { hash } = hashPassword(password, salt);
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(expectedHash, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type DemoSession = { uid: string };

/** Nilai cookie `demo_session`. */
export function createSessionValue(uid: string): string {
  const payload = b64urlEncode(JSON.stringify({ uid }));
  return `${payload}.${sign(payload)}`;
}

export function parseSessionValue(value: string | undefined): DemoSession | null {
  if (!value) {
    return null;
  }
  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = sign(payload);
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(b64urlDecode(payload)) as DemoSession;
    return typeof parsed.uid === "string" ? { uid: parsed.uid } : null;
  } catch {
    return null;
  }
}

/** User demo yang sedang login, atau null bila cookie tidak valid. */
export async function getDemoSessionUser(): Promise<Omit<
  DemoUser,
  "password_salt" | "password_hash"
> | null> {
  const store = await cookies();
  const session = parseSessionValue(store.get(DEMO_SESSION_COOKIE)?.value);
  if (!session) {
    return null;
  }

  const db = loadDb();
  const user = db.users.find((row) => row.id === session.uid);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    created_at: user.created_at,
  };
}

export async function setDemoSessionCookie(uid: string): Promise<void> {
  const store = await cookies();
  store.set(DEMO_SESSION_COOKIE, createSessionValue(uid), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
}

export async function clearDemoSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(DEMO_SESSION_COOKIE);
}
