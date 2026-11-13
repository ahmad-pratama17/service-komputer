"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CircleCheck, TriangleAlert } from "lucide-react";
import {
  createInvoiceAction,
  updateInvoicePaymentAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  MANUAL_PAYMENT_STATUSES,
  PAYMENT_STATUS_LABEL,
} from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { AdminInvoiceItem } from "@/lib/admin";

type InvoicePanelProps = {
  orderId: string;
  invoices: AdminInvoiceItem[];
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan..." : label}
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

function CreateInvoiceForm({ orderId }: { orderId: string }) {
  const [state, formAction] = useActionState<
    AdminActionState | null,
    FormData
  >(createInvoiceAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />

      <p className="text-sm text-zinc-500">
        Belum ada tagihan untuk pesanan ini. Satu pesanan hanya dapat memiliki
        satu tagihan.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="invoiceDescription">Deskripsi pekerjaan</Label>
        <textarea
          id="invoiceDescription"
          name="description"
          rows={3}
          required
          minLength={5}
          maxLength={500}
          placeholder="Contoh: Pembersihan cache dan penggantian thermal paste laptop."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <p className="text-xs text-zinc-500">
          Uraian yang dibaca customer di halaman tagihan.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="subtotal">Subtotal (Rp)</Label>
          <Input
            id="subtotal"
            name="subtotal"
            type="number"
            min={0}
            step={1000}
            inputMode="numeric"
            placeholder="300000"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="total">Total (Rp)</Label>
          <Input
            id="total"
            name="total"
            type="number"
            min={0}
            step={1000}
            inputMode="numeric"
            placeholder="350000"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dueAt">Jatuh Tempo</Label>
          <Input
            id="dueAt"
            name="dueAt"
            type="date"
            aria-describedby="dueAtHint"
          />
          <p id="dueAtHint" className="text-xs text-zinc-500">
            Opsional.
          </p>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Total harus lebih besar atau sama dengan subtotal. Pembayaran dicatat
        manual oleh admin pada halaman Tagihan.
      </p>

      <StatusMessage state={state} />

      <SubmitButton label="Buat Tagihan" />
    </form>
  );
}

function InvoicePaymentForm({ invoice }: { invoice: AdminInvoiceItem }) {
  const [state, formAction] = useActionState<
    AdminActionState | null,
    FormData
  >(updateInvoicePaymentAction, null);

  // partly_paid tidak lagi dipakai di MVP. Kalau baris lama masih punya
  // nilai itu, tetap ditampilkan supaya admin bisa memindahkannya ke status
  // yang benar tanpa melihat select kosong.
  const options = MANUAL_PAYMENT_STATUSES.includes(invoice.payment_status)
    ? MANUAL_PAYMENT_STATUSES
    : [...MANUAL_PAYMENT_STATUSES, invoice.payment_status];

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="col-span-2">
          <dt className="text-xs text-zinc-500">Deskripsi</dt>
          <dd className="mt-0.5 leading-relaxed whitespace-pre-line">
            {invoice.description}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Subtotal</dt>
          <dd className="font-medium">{formatCurrency(invoice.subtotal)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Total</dt>
          <dd className="font-medium">{formatCurrency(invoice.total)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Diterbitkan</dt>
          <dd>{formatDateTime(invoice.issued_at)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Jatuh Tempo</dt>
          <dd>{invoice.due_at ? formatDate(invoice.due_at) : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Status</dt>
          <dd>{PAYMENT_STATUS_LABEL[invoice.payment_status]}</dd>
        </div>
        {invoice.paid_at ? (
          <div>
            <dt className="text-xs text-zinc-500">Dibayar</dt>
            <dd>{formatDateTime(invoice.paid_at)}</dd>
          </div>
        ) : null}
      </dl>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="invoiceId" value={invoice.id} />

        <div className="space-y-1.5">
          <Label htmlFor={`paymentStatus-${invoice.id}`}>
            Update status pembayaran
          </Label>
          <Select
            id={`paymentStatus-${invoice.id}`}
            name="paymentStatus"
            defaultValue={invoice.payment_status}
          >
            {options.map((status) => (
              <option key={status} value={status}>
                {PAYMENT_STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
          <p className="text-xs text-zinc-500">
            &ldquo;Menunggu Verifikasi&rdquo; dipakai saat customer sudah
            transfer tetapi admin belum menerima dana. Memilih &ldquo;Lunas&rdquo;
            mengisi tanggal bayar secara otomatis.
          </p>
        </div>

        <StatusMessage state={state} />

        <SubmitButton label="Perbarui Pembayaran" />
      </form>
    </div>
  );
}

export function InvoicePanel({ orderId, invoices }: InvoicePanelProps) {
  if (invoices.length === 0) {
    return <CreateInvoiceForm orderId={orderId} />;
  }

  const [latest] = invoices;

  return (
    <div className="space-y-4">
      {invoices.length > 1 ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Ada {invoices.length} tagihan pada pesanan ini. Yang ditampilkan adalah
          tagihan terbaru {latest.invoice_number}.
        </p>
      ) : null}

      <p className="text-sm font-medium">{latest.invoice_number}</p>

      <InvoicePaymentForm invoice={latest} />
    </div>
  );
}
