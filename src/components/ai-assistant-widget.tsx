"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Expand,
  Loader2,
  SendHorizontal,
  Trash2,
  TriangleAlert,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AI_CHAT_SUGGESTIONS,
  postAiChat,
} from "@/components/customer/ai-chat";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/validations/ai";
import { formatDateTime } from "@/lib/utils";
import type { AiRole } from "@/types";

type WidgetBubble = {
  id: string;
  role: AiRole;
  message: string;
  created_at: string;
  pending?: boolean;
};

/**
 * Widget AI Assistant mengambang di kanan bawah, seperti chat web pada
 * umumnya. Tombol bulat memakai ikon /ai-icon.png; bila berkasnya belum
 * ada, otomatis diganti ikon Bot agar tidak ada gambar rusak.
 *
 * Hanya tampil di area customer (/dashboard...), kecuali halaman penuh
 * /dashboard/ai yang memang sudah berisi chat. Riwayat dan pengiriman
 * memakai endpoint JSON /api/ai/chat yang sama dengan halaman penuh,
 * sehingga percakapan tersambung di keduanya.
 */
export function AiAssistantWidget() {
  const pathname = usePathname();
  // Panel terikat pada halaman tempat ia dibuka: pindah halaman otomatis
  // menutupnya tanpa effect (mematuhi lint react-hooks/set-state-in-effect).
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [history, setHistory] = useState<WidgetBubble[]>([]);
  const [optimistic, setOptimistic] = useState<WidgetBubble[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible =
    pathname.startsWith("/dashboard") && pathname !== "/dashboard/ai";

  const bubbles = [...history, ...optimistic];
  const waiting = optimistic.length > 0;

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [bubbles.length, waiting, open]);

  // Tutup panel saat pindah halaman ditangani oleh `openFor`: panel hanya
  // tampil bila halaman aktif sama dengan halaman tempat ia dibuka.

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/chat", { method: "GET" });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        aiEnabled?: boolean;
        messages?: WidgetBubble[];
      };
      if (!data.ok) {
        setError(data.message ?? "Gagal memuat percakapan.");
        return;
      }
      setAiEnabled(data.aiEnabled ?? true);
      setHistory(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      setError("Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    if (open) {
      setOpenFor(null);
      return;
    }
    setOpenFor(pathname);
    if (!started) {
      setStarted(true);
      void loadHistory();
    }
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    if (!value || sending || !aiEnabled) {
      return;
    }

    setOptimistic([
      {
        id: `widget-pending-${Date.now()}`,
        role: "user",
        message: value,
        created_at: new Date().toISOString(),
        pending: true,
      },
    ]);
    setError(null);
    setSending(true);

    const result = await postAiChat({ message: value });

    if (!result.ok) {
      setOptimistic([]);
      setError(result.message);
      setSending(false);
      return;
    }

    const now = new Date().toISOString();
    setHistory((prev) => [
      ...prev,
      {
        id: `widget-sent-${Date.now()}`,
        role: "user",
        message: value,
        created_at: now,
      },
      {
        id: `widget-reply-${Date.now()}`,
        role: "assistant",
        message: result.reply,
        created_at: now,
      },
    ]);
    setOptimistic([]);
    setDraft("");
    setSending(false);
  }

  async function handleClear() {
    if (clearing) {
      return;
    }
    setClearing(true);
    setError(null);

    const result = await postAiChat({ action: "clear" });

    if (!result.ok) {
      setError(result.message);
      setClearing(false);
      return;
    }

    setHistory([]);
    setOptimistic([]);
    setClearing(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-5 sm:bottom-5">
      {open ? (
        <section
          aria-label="AI Assistant"
          className="flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        >
          <header className="flex items-center gap-2.5 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <Bot className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                AI Assistant
              </p>
              <p className="truncate text-xs text-zinc-500">
                {aiEnabled ? "Siap membantu" : "Belum dikonfigurasi"}
              </p>
            </div>
            {bubbles.length > 0 ? (
              <button
                type="button"
                onClick={handleClear}
                disabled={clearing}
                title="Hapus riwayat"
                aria-label="Hapus riwayat percakapan"
                className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
            <Link
              href="/dashboard/ai"
              title="Buka halaman penuh"
              aria-label="Buka halaman penuh AI Assistant"
              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <Expand className="h-4 w-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => setOpenFor(null)}
              aria-label="Tutup AI Assistant"
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
            {loading ? (
              <p className="flex items-center gap-2 py-6 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Memuat percakapan...
              </p>
            ) : bubbles.length === 0 ? (
              <div className="space-y-3 py-4 text-center">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Tanyakan apa saja tentang masalah perangkat Anda atau
                  layanan yang tersedia.
                </p>
                <ul className="flex flex-wrap justify-center gap-2">
                  {AI_CHAT_SUGGESTIONS.slice(0, 3).map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        disabled={!aiEnabled}
                        onClick={() => setDraft(suggestion)}
                        className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-blue-800 dark:hover:text-blue-300"
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
                        {isUser && !bubble.pending
                          ? "Anda"
                          : formatDateTime(bubble.created_at)}
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

            {waiting ? (
              <p className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                AI sedang berpikir...
              </p>
            ) : null}
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
            <label htmlFor="widget-ai-message" className="sr-only">
              Pesan untuk AI Assistant
            </label>
            <input
              id="widget-ai-message"
              name="message"
              type="text"
              autoComplete="off"
              maxLength={MAX_CHAT_MESSAGE_LENGTH}
              disabled={!aiEnabled}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Tulis pesan..."
              className="min-w-0 flex-1 rounded-full border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <Button
              type="submit"
              aria-label="Kirim pesan"
              disabled={!aiEnabled || draft.trim().length === 0 || sending}
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
        aria-label={open ? "Tutup AI Assistant" : "Buka AI Assistant"}
        title="AI Assistant"
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white shadow-xl ring-1 ring-zinc-200 transition-transform hover:scale-105 active:scale-95 dark:bg-zinc-900 dark:ring-zinc-700"
      >
        {open ? (
          <X className="h-6 w-6 text-zinc-700 dark:text-zinc-200" aria-hidden />
        ) : (
          <Bot className="h-7 w-7 text-blue-600 dark:text-blue-400" aria-hidden />
        )}
      </button>
    </div>
  );
}
