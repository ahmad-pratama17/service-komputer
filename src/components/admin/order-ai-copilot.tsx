"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Bot,
  ClipboardCheck,
  Copy,
  Loader2,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import {
  analyzeOrderWithAiAction,
  type AdminAiState,
} from "@/app/actions/admin-ai";
import { Button } from "@/components/ui/button";
import {
  COPILOT_SECTIONS,
  analysisToPlainText,
  sectionToText,
  type OrderAnalysis,
} from "@/lib/ai/copilot-shared";

type OrderAiCopilotProps = {
  orderId: string;
  hasHistory: boolean;
};

function AnalyzeButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Bot className="h-4 w-4" aria-hidden />
      )}
      {pending ? "Menganalisis..." : "Analisis dengan AI"}
    </Button>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? (
        <ClipboardCheck className="h-4 w-4" aria-hidden />
      ) : (
        <Copy className="h-4 w-4" aria-hidden />
      )}
      <span className="sr-only">{label}</span>
    </Button>
  );
}

function AnalysisBody({ analysis }: { analysis: OrderAnalysis }) {
  return (
    <dl className="space-y-5">
      {COPILOT_SECTIONS.map((section) => {
        const value = analysis[section.key];

        return (
          <div key={section.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {section.label}
              </dt>
              <CopyButton
                label={`Salin ${section.label}`}
                text={sectionToText(value)}
              />
            </div>

            <dd className="space-y-1 text-sm text-zinc-900 dark:text-zinc-100">
              {Array.isArray(value) ? (
                <ul className="list-disc space-y-1 pl-5">
                  {value.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="whitespace-pre-wrap">{value}</p>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function OrderAiCopilot({ orderId, hasHistory }: OrderAiCopilotProps) {
  const [state, formAction] = useActionState<AdminAiState | null, FormData>(
    analyzeOrderWithAiAction,
    null,
  );

  const analysis = state?.ok ? state.analysis : undefined;

  return (
    <div className="space-y-4">
      <form action={formAction}>
        <input type="hidden" name="orderId" value={orderId} />
        <AnalyzeButton disabled={false} />
      </form>

      <p className="text-xs text-zinc-500">
        Konteks yang dianalisis: layanan, perangkat, deskripsi keluhan, catatan
        customer{hasHistory ? ", dan riwayat service sebelumnya" : ""}.
      </p>

      {state && !state.ok ? (
        <p
          className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {state.message}
        </p>
      ) : null}

      {analysis ? (
        <>
          <p
            className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
            role="status"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Ini hanya rekomendasi. Tinjau dan sunting sendiri sebelum
              menyalinnya ke diagnosis atau mengirimkannya ke customer. Status dan
              harga tidak diubah oleh AI.
            </span>
          </p>

          <AnalysisBody analysis={analysis} />

          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <CopyButton
              label="Salin seluruh hasil analisis"
              text={analysisToPlainText(analysis)}
            />
            <span className="text-xs text-zinc-500">
              Salin per bagian atau seluruh hasil di atas.
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}