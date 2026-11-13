"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CircleCheck, TriangleAlert } from "lucide-react";
import {
  updateOrderDetailsAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Form diagnosis khusus teknisi: hanya field diagnosis yang tampil.
 * Biaya dan catatan internal TIDAK dikirim dari UI ini, dan server action
 * mengabaikannya bila pemanggil teknisi — jadi tidak ada jalur yang bisa
 * dipakai teknisi untuk mengubah angka keuangan.
 */
export function TeknisiDiagnosisForm({
  orderId,
  diagnosis,
}: {
  orderId: string;
  diagnosis: string | null;
}) {
  const [state, formAction] = useActionState<
    AdminActionState | null,
    FormData
  >(updateOrderDetailsAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />

      <div className="space-y-1.5">
        <Label htmlFor="teknisi-diagnosis">Diagnosis teknisi</Label>
        <Textarea
          id="teknisi-diagnosis"
          name="diagnosis"
          rows={5}
          maxLength={2000}
          defaultValue={diagnosis ?? ""}
          placeholder="Jelaskan hasil pemeriksaan dan tindakan yang dilakukan."
        />
        <p className="text-xs text-zinc-500">
          Customer menerima notifikasi saat diagnosis ini diubah.
        </p>
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

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan..." : "Simpan Diagnosis"}
    </Button>
  );
}
