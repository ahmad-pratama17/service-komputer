"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CircleCheck, Lock, TriangleAlert } from "lucide-react";
import {
  updateOrderStatusAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import { nextStatuses } from "@/lib/order-status";
import type { OrderStatus } from "@/types";

type OrderStatusFormProps = {
  orderId: string;
  currentStatus: OrderStatus;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? "Menyimpan..." : "Perbarui Status"}
    </Button>
  );
}

export function OrderStatusForm({
  orderId,
  currentStatus,
}: OrderStatusFormProps) {
  const [state, formAction] = useActionState<
    AdminActionState | null,
    FormData
  >(updateOrderStatusAction, null);

  const options = nextStatuses(currentStatus);

  if (options.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          Status <strong>{ORDER_STATUS_LABEL[currentStatus]}</strong> bersifat
          final. Status tidak dapat diubah lagi.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />

      <div className="space-y-1.5">
        <Label htmlFor="status">Status berikutnya</Label>
        <Select id="status" name="status" defaultValue={options[0]}>
          {options.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABEL[status]}
            </option>
          ))}
        </Select>
        <p className="text-xs text-zinc-500">
          Hanya status yang valid untuk tahap ini yang bisa dipilih. Perubahan
          dicatat otomatis di riwayat pesanan.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">Catatan transisi (opsional)</Label>
        <Input
          id="note"
          name="note"
          maxLength={500}
          placeholder="Contoh: Diagnosa selesai, estimasi biaya Rp350.000"
        />
      </div>

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

      <SubmitButton disabled={options.length === 0} />
    </form>
  );
}
