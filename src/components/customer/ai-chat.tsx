"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  CircleCheck,
  Loader2,
  SendHorizontal,
  Trash2,
  TriangleAlert,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/validations/ai";
import { formatDateTime } from "@/lib/utils";
import type { AiMessage } from "@/lib/ai/conversations";
import type { AiRole } from "@/types";

type AiChatProps = {
  messages: AiMessage[];
  aiEnabled: boolean;
  userRole?: string;
};

type Bubble = {
  id: string;
  role: AiRole;
  message: string;
  created_at: string;
  pending?: boolean;
};

type SendResult =
  | { ok: true; reply: string }
  | { ok: false; message: string };

export const AI_CHAT_SUGGESTIONS = [
  "Laptop saya lambat sekali, layanan apa yang cocok?",
  "Komputer tidak bisa konek internet, apa penyebabnya?",
  "Berapa estimasi biaya untuk ganti keyboard?",
  "Hard disk saya tiba-tiba tidak terbaca, apa yang bisa saya cek sendiri?",
];

/**
 * Pengiriman lewat fetch JSON ke /api/ai/chat, bukan form action.
 *
 * Form action menyimpan ID action di HTML saat render; tab basi yang dibuka
 * lintas restart server memegang ID mati sehingga klik Kirim tidak pernah
 * sampai tanpa error apa pun. Endpoint JSON beralamat stabil sehingga kebal
 * terhadap masalah itu. Tampilan dan perilaku dibuat identik: optimistis,
 * spinner, banner error, dan rate limit tetap dari server.
 *
 * Timeout 90 detik: model reasoning (Nemotron) kadang berpikir 20-60 detik.
 * Tanpa batas, spinner "berpikir" bisa jalan selamanya bila provider macet,
 * dan pengguna mengira tombolnya mati.
 */
const SEND_TIMEOUT_MS = 90_000;

export async function postAiChat(
  body: Record<string, unknown>,
): Promise<SendResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        message:
          "AI terlalu lama merespons (lebih dari 90 detik). Silakan coba lagi.",
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

export function AiChat({ messages, aiEnabled, userRole }: AiChatProps) {
  const [draft, setDraft] = useState("");
  const [optimistic, setOptimistic] = useState<Bubble[]>([]);
  const [confirmed, setConfirmed] = useState<Bubble[]>([]);
  const [cleared, setCleared] = useState(false);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Setelah hapus riwayat, prop `messages` basi sampai navigasi berikutnya,
  // jadi riwayat efektif dihitung tanpa prop tersebut.
  const baseHistory: Bubble[] = cleared ? confirmed : [...messages, ...confirmed];
  const bubbles: Bubble[] = [...baseHistory, ...optimistic];
  const waiting = optimistic.length > 0;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [bubbles.length, waiting]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    if (!value || sending || !aiEnabled) {
      return;
    }

    const pendingBubble: Bubble = {
      id: `pending-${Date.now()}`,
      role: "user",
      message: value,
      created_at: new Date().toISOString(),
      pending: true,
    };

    setOptimistic([pendingBubble]);
    setError(null);
    setNotice(null);
    setSending(true);

    const result = await postAiChat({ message: value, userRole });

    if (!result.ok) {
      setOptimistic([]);
      setError(result.message);
      setSending(false);
      return;
    }

    const now = new Date().toISOString();
    setConfirmed((prev) => [
      ...prev,
      {
        id: `sent-${Date.now()}`,
        role: "user",
        message: value,
        created_at: now,
      },
      {
        id: `reply-${Date.now()}`,
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

    setConfirmed([]);
    setOptimistic([]);
    setCleared(true);
    setNotice("Riwayat percakapan dihapus.");
    setClearing(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          Sesi ini tersimpan pada akun Anda dan tidak dibagikan ke pengguna lain.
        </p>

        {bubbles.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            disabled={clearing}
            onClick={handleClear}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {clearing ? "Menghapus..." : "Hapus Riwayat"}
          </Button>
        ) : null}
      </div>

      {notice ? (
        <p
          className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          role="status"
        >
          {notice}
        </p>
      ) : null}

      <div
        ref={scrollRef}
        aria-live="polite"
        aria-label="Percakapan dengan AI Assistant"
        className="max-h-[28rem] space-y-4 overflow-y-auto rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        {bubbles.length === 0 ? (
          <div className="space-y-3 py-4 text-center">
            <Bot
              className="mx-auto h-8 w-8 text-zinc-400"
              aria-hidden
            />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Tanyakan apa saja tentang masalah perangkat Anda atau layanan yang
              tersedia.
            </p>
          </div>
        ) : (
          bubbles.map((bubble) => {
            const isUser = bubble.role === "user";

            return (
              <div
                key={bubble.id}
                className={`flex gap-3 ${isUser ? "justify-end" : ""}`}
              >
                {!isUser ? (
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                    aria-hidden
                  >
                    <Bot className="h-4 w-4" />
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
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    aria-hidden
                  >
                    <User className="h-4 w-4" />
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
          className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      {!aiEnabled ? (
        <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          AI Assistant belum dikonfigurasi. Admin perlu mengatur OPENAI_API_KEY
          pada server.
        </p>
      ) : null}

      {baseHistory.length === 0 ? (
        <ul className="flex flex-wrap gap-2">
          {AI_CHAT_SUGGESTIONS.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                disabled={!aiEnabled}
                onClick={() => setDraft(suggestion)}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-blue-800 dark:hover:text-blue-300"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={handleSend} className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor="message"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Pesan Anda
          </label>
          <textarea
            id="message"
            name="message"
            rows={3}
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
            required
            disabled={!aiEnabled}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Contoh: laptop saya mati total, apa yang bisa saya cek sendiri?"
            className="flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={!aiEnabled || draft.trim().length === 0 || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <SendHorizontal className="h-4 w-4" aria-hidden />
            )}
            {sending ? "Mengirim..." : "Kirim"}
          </Button>
          {sending ? (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <CircleCheck className="h-3.5 w-3.5" aria-hidden />
              Mengirim pesan...
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
