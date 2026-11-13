"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Expand,
  Loader2,
  SendHorizontal,
  TriangleAlert,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/validations/ai";
import { formatDateTime } from "@/lib/utils";
import type { StaffAgentRole } from "@/lib/ai/staff-agent";

type WidgetBubble = {
  id: string;
  role: "user" | "assistant";
  message: string;
  created_at: string;
  pending?: boolean;
};

const ADMIN_SUGGESTIONS = [
  "Pesanan apa saja yang masih pending?",
  "Berapa total tagihan yang belum dibayar?",
  "Layanan apa saja yang tersedia?",
];

const TEKNISI_SUGGESTIONS = [
  "Pesanan apa saja yang perlu saya kerjakan?",
  "Tampilkan pesanan yang masih pending",
  "Layanan apa saja yang tersedia?",
];

/**
 * Widget AI Asisten staf mengambang di kanan bawah, sama seperti milik
 * customer. Peran dibaca dari alamat halaman: /admin... = admin,
 * /teknisi... = teknisi. Batas peran (mis. angka keuangan khusus admin)
 * tetap ditegakkan server — widget hanya meneruskan pertanyaan.
 *
 * Stateless seperti halaman penuh: riwayat hanya hidup di browser sesi ini.
 * Timeout 150 detik karena satu pertanyaan bisa memicu beberapa putaran
 * model reasoning.
 */
const SEND_TIMEOUT_MS = 150_000;

async function postStaffWidgetChat(
  message: string,
): Promise<{ ok: true; reply: string } | { ok: false; message: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("/api/ai/staff-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        message: "AI terlalu lama merespons. Coba pertanyaan yang lebih spesifik.",
      };
    }
    return { ok: false, message: "Tidak dapat menghubungi server. Coba lagi." };
  }
  clearTimeout(timer);

  try {
    const data = (await response.json()) as {
      ok?: boolean;
      message?: string;
      reply?: string;
    };
    if (data.ok) {
      return { ok: true, reply: data.reply ?? "" };
    }
    return { ok: false, message: data.message ?? "Gagal mengirim pesan." };
  } catch {
    return { ok: false, message: "Respons server tidak valid. Coba lagi." };
  }
}

export function StaffAssistantWidget() {
  const pathname = usePathname();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<WidgetBubble[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iconMissing, setIconMissing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdminArea = pathname.startsWith("/admin");
  const isTeknisiArea = pathname.startsWith("/teknisi");
  const role: StaffAgentRole | null = isAdminArea
    ? "admin"
    : isTeknisiArea
      ? "teknisi"
      : null;

  const onFullPage =
    pathname === "/admin/assistant" || pathname === "/teknisi/assistant";
  const visible = role !== null && !onFullPage;
  const open = openFor === pathname;

  const suggestions = role === "admin" ? ADMIN_SUGGESTIONS : TEKNISI_SUGGESTIONS;
  const fullPageHref = role === "admin" ? "/admin/assistant" : "/teknisi/assistant";
  const waiting = bubbles.some((b) => b.pending);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [bubbles.length, waiting, open]);

  function toggle() {
    setOpenFor(open ? null : pathname);
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    if (!value || sending) {
      return;
    }

    const now = new Date().toISOString();
    setBubbles((prev) => [
      ...prev,
      { id: `w-q-${Date.now()}`, role: "user", message: value, created_at: now },
      {
        id: `w-a-pending-${Date.now()}`,
        role: "assistant",
        message: "",
        created_at: now,
        pending: true,
      },
    ]);
    setError(null);
    setDraft("");
    setSending(true);

    const result = await postStaffWidgetChat(value);

    if (!result.ok) {
      setBubbles((prev) => prev.filter((b) => !b.pending));
      setError(result.message);
      setSending(false);
      return;
    }

    setBubbles((prev) => [
      ...prev.filter((b) => !b.pending),
      {
        id: `w-a-${Date.now()}`,
        role: "assistant",
        message: result.reply,
        created_at: new Date().toISOString(),
      },
    ]);
    setSending(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-5 sm:bottom-5">
      {open ? (
        <section
          aria-label="AI Asisten staf"
          className="flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        >
          <header className="flex items-center gap-2.5 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            {iconMissing ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <Bot className="h-5 w-5" aria-hidden />
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/ai-icon.png"
                alt=""
                aria-hidden
                className="h-9 w-9 shrink-0 rounded-full object-cover"
                onError={() => setIconMissing(true)}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                AI Asisten
              </p>
              <p className="truncate text-xs text-zinc-500">
                Membaca data operasional
              </p>
            </div>
            <Link
              href={fullPageHref}
              title="Buka halaman penuh"
              aria-label="Buka halaman penuh AI Asisten"
              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <Expand className="h-4 w-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => setOpenFor(null)}
              aria-label="Tutup AI Asisten"
              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <div
            ref={scrollRef}
            aria-live="polite"
            className="min-h-48 flex-1 space-y-3 overflow-y-auto px-4 py-3"
          >
            {bubbles.length === 0 ? (
              <div className="space-y-3 py-4 text-center">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Tanyakan antrean pesanan, tagihan, layanan, atau pelanggan.
                </p>
                <ul className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        onClick={() => setDraft(suggestion)}
                        className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-blue-800 dark:hover:text-blue-300"
                      >
                        {suggestion.length > 48
                          ? `${suggestion.slice(0, 48)}...`
                          : suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              bubbles.map((bubble) => {
                const isUser = bubble.role === "user";
                if (bubble.pending) {
                  return (
                    <p
                      key={bubble.id}
                      className="flex items-center gap-2 text-sm text-zinc-500"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Membaca database...
                    </p>
                  );
                }
                return (
                  <div
                    key={bubble.id}
                    className={`flex gap-2 ${isUser ? "justify-end" : ""}`}
                  >
                    {!isUser ? (
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                        aria-hidden
                      >
                        <Bot className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                        isUser
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      }`}
                    >
                      {bubble.message}
                      <p
                        className={`mt-1 text-[11px] ${
                          isUser ? "text-blue-100" : "text-zinc-400"
                        }`}
                      >
                        {isUser ? "Anda" : formatDateTime(bubble.created_at)}
                      </p>
                    </div>
                    {isUser ? (
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        aria-hidden
                      >
                        <User className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          {error ? (
            <p
              role="alert"
              className="mx-4 mb-2 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              <TriangleAlert
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden
              />
              {error}
            </p>
          ) : null}

          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 border-t border-zinc-200 px-3 py-2.5 dark:border-zinc-800"
          >
            <label htmlFor="staff-widget-message" className="sr-only">
              Pertanyaan untuk AI Asisten
            </label>
            <input
              id="staff-widget-message"
              name="message"
              type="text"
              autoComplete="off"
              maxLength={MAX_CHAT_MESSAGE_LENGTH}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Tulis pertanyaan..."
              className="min-w-0 flex-1 rounded-full border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <Button
              type="submit"
              aria-label="Kirim pertanyaan"
              disabled={draft.trim().length === 0 || sending}
              className="h-9 w-9 shrink-0 rounded-full !px-0"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <SendHorizontal className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? "Tutup AI Asisten" : "Buka AI Asisten"}
        title="AI Asisten"
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white shadow-xl ring-1 ring-zinc-200 transition-transform hover:scale-105 active:scale-95 dark:bg-zinc-900 dark:ring-zinc-700"
      >
        {open ? (
          <X className="h-6 w-6 text-zinc-700 dark:text-zinc-200" aria-hidden />
        ) : iconMissing ? (
          <Bot className="h-7 w-7 text-blue-600 dark:text-blue-400" aria-hidden />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/ai-icon.png"
            alt="AI Asisten"
            className="h-full w-full object-cover"
            onError={() => setIconMissing(true)}
          />
        )}
      </button>
    </div>
  );
}
