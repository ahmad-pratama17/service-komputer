"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CircleCheck, TriangleAlert } from "lucide-react";
import {
  updateInvoicePaymentAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { PAYMENT_STATUS_LABEL } from "@/lib/constants";
import type { InvoicePaymentStatus } from "@/types";

type InvoicePaymentControlProps = {
  invoiceId: string;
  currentStatus: InvoicePaymentStatus;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? "Menyimpan..." : "Simpan"}
    </Button>
  );
}

export function InvoicePaymentControl({
  invoiceId,
  currentStatus,
}: InvoicePaymentControlProps) {
  const [state, formAction] = useActionState<
    AdminActionState | null,
    FormData
  >(updateInvoicePaymentAction, null);

  return (
    <form action={formAction} className="flex items-center justify-end gap-2">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <label className="sr-only" htmlFor={`payment-${invoiceId}`}>
        Status pembayaran
      </label>
      <Select
        id={`payment-${invoiceId}`}
        name="paymentStatus"
        defaultValue={currentStatus}
        className="h-9 w-40"
      >
        {(Object.keys(PAYMENT_STATUS_LABEL) as InvoicePaymentStatus[]).map(
          (status) => (
            <option key={status} value={status}>
              {PAYMENT_STATUS_LABEL[status]}
            </option>
          ),
        )}
      </Select>
      <SubmitButton />
      {state ? (
        <span
          className={`flex items-center gap-1 text-xs ${
            state.ok
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
          role="status"
        >
          {state.ok ? (
            <CircleCheck className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
          )}
          {state.ok ? "Tersimpan" : state.message}
        </span>
      ) : null}
    </form>
  );
}
