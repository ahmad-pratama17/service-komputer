"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CircleCheck, ThumbsUp, TriangleAlert } from "lucide-react";
import {
  approveMyOrderAction,
  type ApproveOrderState,
} from "@/app/actions/order";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type OrderApprovalCardProps = {
  orderId: string;
  estimatedCost: number | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      <ThumbsUp className="h-4 w-4" aria-hidden />
      {pending ? "Mengirim..." : "Setujui & Lanjutkan"}
    </Button>
  );
}

export function OrderApprovalCard({
  orderId,
  estimatedCost,
}: OrderApprovalCardProps) {
  const [state, formAction] = useActionState<
    ApproveOrderState | null,
    FormData
  >(approveMyOrderAction, null);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        Menunggu Persetujuan Anda
      </h2>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-300/90">
        Teknisi sudah menyelesaikan diagnosa
        {estimatedCost !== null
          ? ` dengan estimasi biaya ${formatCurrency(estimatedCost)}`
          : ""}
        . Setujui agar pengerjaan dapat dimulai.
      </p>

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="orderId" value={orderId} />

        {state ? (
          <p
            className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
              state.ok
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
            }`}
            role="status"
          >
            {state.ok ? (
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            )}
            {state.message}
          </p>
        ) : null}

        <SubmitButton />
      </form>
    </div>
  );
}
