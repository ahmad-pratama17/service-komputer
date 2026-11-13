"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Loader2,
  SendHorizontal,
  TriangleAlert,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/validations/ai";
import { formatDateTime } from "@/lib/utils";
import type { StaffAgentRole } from "@/lib/ai/staff-agent";

type TranscriptBubble = {
  id: string;
  role: "user" | "assistant";
  message: string;
  created_at: string;
  pending?: boolean;
};

/**
 * Chat AI staf: diskusi operasional yang bisa membaca database (antrean
 * pesanan, tagihan, layanan, pelanggan). Stateless — riwayat hanya di
 * browser sesi ini, tidak disimpan ke database.
 *
 * Timeout 150 detik: satu pertanyaan bisa memicu 2-3 putaran model, dan
 * model reasoning kadang berpikir 20-60 detik per putaran.
 */
const SEND_TIMEOUT_MS = 150_000;

async function postStaffChat(
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
        message:
          "AI terlalu lama merespons (lebih dari 150 detik). Coba pertanyaan yang lebih spesifik.",
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

export function StaffAiChat({
  role,
  suggestions,
}: {
  role: StaffAgentRole;
  suggestions: string[];
}) {
  const [draft, setDraft] = useState("");
  const [bubbles, setBubbles] = useState<TranscriptBubble[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const waiting = bubbles.some((b) => b.pending);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [bubbles.length, waiting]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    if (!value || sending) {
      return;
    }

    const now = new Date().toISOString();
    setBubbles((prev) => [
      ...prev,
      { id: `q-${Date.now()}`, role: "user", message: value, created_at: now },
      {
        id: `a-pending-${Date.now()}`,
        role: "assistant",
        message: "",
        created_at: now,
        pending: true,
      },
    ]);
    setError(null);
    setDraft("");
    setSending(true);

    const result = await postStaffChat(value);

    if (!result.ok) {
      setBubbles((prev) => prev.filter((b) => !b.pending));
      setError(result.message);
      setSending(false);
      return;
    }

    setBubbles((prev) => [
      ...prev.filter((b) => !b.pending),
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        message: result.reply,
        created_at: new Date().toISOString(),
      },
    ]);
    setSending(false);
  }

  return (
    <div className="space-y-4">
      <div
        ref={scrollRef}
        aria-live="polite"
        aria-label={`Percakapan dengan AI Asisten (${role})`}
        className="max-h-[28rem] space-y-4 overflow-y-auto rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        {bubbles.length === 0 ? (
          <div className="space-y-3 py-4 text-center">
            <Bot className="mx-auto h-8 w-8 text-zinc-400" aria-hidden />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Tanyakan tentang antrean pesanan, tagihan, layanan, atau
              pelanggan — saya bacakan datanya untuk Anda.
            </p>
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
                  Membaca database dan menyusun jawaban...
                </p>
              );
            }
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
                    {isUser ? "Anda" : formatDateTime(bubble.created_at)}
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

      {bubbles.length === 0 ? (
        <ul className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => setDraft(suggestion)}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-blue-800 dark:hover:text-blue-300"
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
            htmlFor="staff-message"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Pertanyaan operasional
          </label>
          <textarea
            id="staff-message"
            name="message"
            rows={3}
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
            required
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Contoh: pesanan apa saja yang masih pending?"
            className="flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={draft.trim().length === 0 || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <SendHorizontal className="h-4 w-4" aria-hidden />
            )}
            {sending ? "Membaca data..." : "Kirim"}
          </Button>
        </div>
      </form>
    </div>
  );
}
