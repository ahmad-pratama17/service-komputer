"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CircleCheck, Send, TriangleAlert } from "lucide-react";
import {
  drainOutboxAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

function DrainButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      <Send className="h-4 w-4" aria-hidden />
      {pending ? "Memproses..." : "Proses antrean WA/Email"}
    </Button>
  );
}

/**
 * Tombol manual pemrosesan outbox email/WhatsApp. Hasil ringkasan
 * ditampilkan di bawah tombol setelah diproses.
 */
export function DrainOutboxButton() {
  const [state, formAction] = useActionState<AdminActionState | null, FormData>(
    async () => drainOutboxAction(),
    null,
  );

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <DrainButton />
      </form>
      {state ? (
        <p
          className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
            state.ok
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
          }`}
          role="status"
        >
          {state.ok ? (
            <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
