"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CircleCheck, TriangleAlert } from "lucide-react";
import {
  updateOrderDetailsAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type OrderDetailsFormProps = {
  orderId: string;
  diagnosis: string | null;
  estimatedCost: number | null;
  finalCost: number | null;
  adminNotes: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan..." : "Simpan Detail"}
    </Button>
  );
}

function StatusMessage({ state }: { state: AdminActionState | null }) {
  if (!state) {
    return null;
  }

  return (
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
  );
}

export function OrderDetailsForm({
  orderId,
  diagnosis,
  estimatedCost,
  finalCost,
  adminNotes,
}: OrderDetailsFormProps) {
  const [state, formAction] = useActionState<
    AdminActionState | null,
    FormData
  >(updateOrderDetailsAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />

      <div className="space-y-1.5">
        <Label htmlFor="diagnosis">Diagnosis teknisi</Label>
        <Textarea
          id="diagnosis"
          name="diagnosis"
          rows={4}
          maxLength={2000}
          defaultValue={diagnosis ?? ""}
          placeholder="Jelaskan hasil pemeriksaan dan tindakan yang perlu dilakukan."
        />
        <p className="text-xs text-zinc-500">
          Customer menerima notifikasi saat diagnosis ini diubah.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="estimatedCost">Estimasi biaya (Rp)</Label>
          <Input
            id="estimatedCost"
            name="estimatedCost"
            type="number"
            min={0}
            step={1000}
            inputMode="numeric"
            defaultValue={estimatedCost ?? ""}
            placeholder="350000"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="finalCost">Biaya final (Rp)</Label>
          <Input
            id="finalCost"
            name="finalCost"
            type="number"
            min={0}
            step={1000}
            inputMode="numeric"
            defaultValue={finalCost ?? ""}
            placeholder="325000"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="adminNotes">Catatan internal admin</Label>
        <Textarea
          id="adminNotes"
          name="adminNotes"
          rows={3}
          maxLength={2000}
          defaultValue={adminNotes ?? ""}
          placeholder="Catatan internal tidak terlihat oleh customer."
        />
      </div>

      <StatusMessage state={state} />

      <SubmitButton />
    </form>
  );
}
