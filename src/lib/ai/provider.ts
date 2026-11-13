import "server-only";

import OpenAI from "openai";
import type { AiRole } from "@/types";

/**
 * Abstraksi provider AI.
 *
 * Dua provider didukung:
 * - OpenAI (default): memakai Responses API dan Structured Outputs.
 * - NVIDIA NIM: memakai endpoint OpenAI-compatible chat/completions di
 *   https://integrate.api.nvidia.com/v1. NIM tidak menyediakan Responses API
 *   maupun json_schema, sehingga Structured Outputs dinonaktifkan otomatis
 *   dan TAHAP 10 memakai mode JSON lewat prompt.
 *
 * Env yang dipakai:
 * - AI_PROVIDER  : "openai" | "nvidia" | "auto" (default "auto")
 * - OPENAI_API_KEY, OPENAI_MODEL, OPENAI_BASE_URL (opsional)
 * - NVIDIA_API_KEY, NVIDIA_MODEL, NVIDIA_BASE_URL (opsional)
 *
 * Semua key hanya dibaca di server lewat modul ini yang meng-import
 * "server-only", dan tidak pernah memakai prefix NEXT_PUBLIC_.
 */

export type AiProviderName = "openai" | "nvidia";

export type AiProvider = {
  name: AiProviderName;
  apiKey: string;
  model: string;
  baseURL?: string;
  /** Structured Outputs hanya tersedia di provider OpenAI. */
  supportsStructuredOutputs: boolean;
};

const NVIDIA_DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b";
const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";
const GENERIC_AI_ERROR = "Gagal memproses permintaan AI. Silakan coba lagi.";

function readProviderPreference(): "openai" | "nvidia" | "auto" {
  const raw = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (raw === "openai" || raw === "nvidia") {
    return raw;
  }

  return "auto";
}

/**
 * Provider aktif, atau null bila tidak ada key yang dikonfigurasi.
 * "auto" memilih OpenAI bila key-nya ada, karena fiturnya lebih lengkap.
 */
export function resolveAiProvider(): AiProvider | null {
  const preference = readProviderPreference();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const nvidiaKey = process.env.NVIDIA_API_KEY?.trim();

  const openaiBaseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;

  // Gemini (dan provider pihak ketiga lain) diakses lewat endpoint
  // OpenAI-compatible namun tidak mendukung Responses API maupun
  // json_schema. Deteksi berdasarkan OPENAI_BASE_URL: bila di-set ke
  // domain selain api.openai.com, anggap Structured Outputs tidak ada.
  const isNativeOpenAI =
    !openaiBaseURL || openaiBaseURL.includes("api.openai.com");

  const openaiProvider: AiProvider | null = openaiKey
    ? {
        name: "openai",
        apiKey: openaiKey,
        model: process.env.OPENAI_MODEL?.trim() || OPENAI_DEFAULT_MODEL,
        baseURL: openaiBaseURL,
        supportsStructuredOutputs: isNativeOpenAI,
      }
    : null;

  const nvidiaProvider: AiProvider | null = nvidiaKey
    ? {
        name: "nvidia",
        apiKey: nvidiaKey,
        model: process.env.NVIDIA_MODEL?.trim() || NVIDIA_DEFAULT_MODEL,
        baseURL:
          process.env.NVIDIA_BASE_URL?.trim() || NVIDIA_DEFAULT_BASE_URL,
        // NIM hanya menyediakan chat/completions.
        supportsStructuredOutputs: false,
      }
    : null;

  if (preference === "nvidia") {
    return nvidiaProvider ?? openaiProvider;
  }

  if (preference === "openai") {
    return openaiProvider ?? nvidiaProvider;
  }

  return openaiProvider ?? nvidiaProvider;
}

export function isAiConfigured(): boolean {
  return resolveAiProvider() !== null;
}

/**
 * Role "system" dipakai, bukan "developer", karena OpenAI menerima keduanya
 * lewat chat/completions tapi sebagian model NIM hanya mengenal "system".
 */
export type ProviderChatMessage = {
  role: AiRole | "system";
  content: string;
};

const clientCache = new Map<string, OpenAI>();

/** Client OpenAI-SDK yang sudah diarahkan ke base URL provider aktif. */
export function getAiClient(provider: AiProvider): OpenAI {
  const cacheKey = `${provider.name}:${provider.baseURL ?? "default"}`;
  const cached = clientCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const defaultHeaders: Record<string, string> = {};
  if (provider.baseURL?.includes("openrouter.ai")) {
    defaultHeaders["HTTP-Referer"] = "https://servicekomputer.id";
    defaultHeaders["X-Title"] = "ServiceKomputer CS";
  }

  const client = new OpenAI({
    apiKey: provider.apiKey,
    ...(provider.baseURL ? { baseURL: provider.baseURL } : {}),
    ...(Object.keys(defaultHeaders).length > 0 ? { defaultHeaders } : {}),
  });

  clientCache.set(cacheKey, client);
  return client;
}

export type ChatCompletionResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

function logAiError(error: unknown): void {
  if (error instanceof OpenAI.APIError) {
    console.error(
      `[ai] provider error: status=${error.status ?? "?"} code=${error.code ?? "?"} message=${error.message}`,
    );
    return;
  }

  console.error("[ai] provider request failed:", error);
}

function describeApiError(error: unknown): string | null {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) {
      return "Kredensial AI tidak valid. Silakan hubungi pemilik server.";
    }
    if (error.status === 402) {
      return "Kuota AI sudah habis. Silakan hubungi pemilik server.";
    }
    if (error.status === 404) {
      return "Model AI tidak ditemukan. Silakan hubungi pemilik server.";
    }
    if (error.status === 429) {
      return "Layanan AI sedang sibuk. Coba lagi beberapa saat lagi.";
    }
    return "Layanan AI sedang tidak tersedia. Coba lagi nanti.";
  }

  return null;
}

/**
 * Satu putaran chat lewat endpoint yang didukung kedua provider.
 */
export async function chatCompletion({
  messages,
  maxOutputTokens,
}: {
  messages: ProviderChatMessage[];
  maxOutputTokens: number;
}): Promise<ChatCompletionResult> {
  const provider = resolveAiProvider();

  if (!provider) {
    return {
      ok: false,
      error: "AI belum dikonfigurasi. Isi OPENAI_API_KEY atau NVIDIA_API_KEY.",
    };
  }

  // Model reasoning (mis. Nemotron di NIM) menghabiskan sebagian budget
  // untuk berpikir sebelum menjawab. Tanpa ruang ekstra, budget habis di
  // tengah bernalar dan `content` kembali null — user hanya melihat
  // "AI tidak memberikan balasan". OpenAI tidak butuh perlakuan ini.
  const effectiveMax =
    provider.name === "nvidia"
      ? Math.max(maxOutputTokens * 2, 1500)
      : maxOutputTokens;

  try {
    const client = getAiClient(provider);
    const completion = await client.chat.completions.create({
      model: provider.model,
      messages,
      max_completion_tokens: effectiveMax,
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      return {
        ok: false,
        error: "AI tidak memberikan balasan. Silakan coba lagi.",
      };
    }

    return { ok: true, content };
  } catch (error) {
    logAiError(error);
    return { ok: false, error: describeApiError(error) ?? GENERIC_AI_ERROR };
  }
}

/**
 * Versi chat yang meminta JSON. Untuk Structured Outputs, provider yang
 * tidak mendukung `json_object` akan dicoba lagi tanpa parameter tersebut.
 */
export async function jsonChatCompletion({
  messages,
  maxOutputTokens,
}: {
  messages: ProviderChatMessage[];
  maxOutputTokens: number;
}): Promise<ChatCompletionResult> {
  const provider = resolveAiProvider();

  if (!provider) {
    return {
      ok: false,
      error: "AI belum dikonfigurasi. Isi OPENAI_API_KEY atau NVIDIA_API_KEY.",
    };
  }

  const client = getAiClient(provider);

  // Alasan sama seperti chatCompletion: model reasoning butuh ruang ekstra.
  const effectiveMax =
    provider.name === "nvidia"
      ? Math.max(maxOutputTokens * 2, 1500)
      : maxOutputTokens;

  try {
    const completion = await client.chat.completions.create({
      model: provider.model,
      messages,
      max_completion_tokens: effectiveMax,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      return {
        ok: false,
        error: "AI tidak memberikan balasan. Silakan coba lagi.",
      };
    }

    return { ok: true, content };
  } catch (error) {
    // Sebagian provider (NIM, Gemini model tertentu) menolak
    // response_format json_object; ulangi tanpa opsi tersebut.
    if (error instanceof OpenAI.APIError && error.status === 400) {
      const retry = await chatCompletion({ messages, maxOutputTokens });
      return retry;
    }

    logAiError(error);
    return { ok: false, error: describeApiError(error) ?? GENERIC_AI_ERROR };
  }
}

/** Nama provider untuk ditampilkan di UI atau pesan diagnostik. */
export function providerDisplayName(provider: AiProvider): string {
  if (provider.name === "nvidia") {
    return `NVIDIA NIM (${provider.model})`;
  }
  if (provider.baseURL?.includes("openrouter.ai")) {
    return `OpenRouter (${provider.model})`;
  }
  if (provider.baseURL && !provider.baseURL.includes("api.openai.com")) {
    return `OpenAI-Compatible (${provider.model})`;
  }
  return `OpenAI (${provider.model})`;
}