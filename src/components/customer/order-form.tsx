"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CircleCheck, Send, X } from "lucide-react";
import { createOrderAction } from "@/app/actions/order";
import type { PublicService } from "@/lib/services";
import type { OrderFormState } from "@/lib/validations/order";
import {
  MAX_ORDER_PHOTOS,
  MAX_ORDER_PHOTO_BYTES,
  ORDER_PHOTO_MIME_TYPES,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const initialState: OrderFormState = { status: "idle" };

type OrderSummary = {
  serviceName: string;
  device: string;
  problemDescription: string;
  address: string;
  preferredSchedule: string;
  additionalNotes: string;
  photoCount: number;
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) {
    return null;
  }
  return (
    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[0]}</p>
  );
}

function ReviewButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      <Send className="h-4 w-4" aria-hidden />
      Tinjau &amp; Kirim Pesanan
    </Button>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-zinc-100 py-2 last:border-b-0 dark:border-zinc-800">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="col-span-2 text-sm text-zinc-900 dark:text-zinc-100">
        {children}
      </dd>
    </div>
  );
}

export function OrderForm({ services }: { services: PublicService[] }) {
  const [state, formAction] = useActionState(createOrderAction, initialState);
  const [photos, setPhotos] = useState<File[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [summary, setSummary] = useState<OrderSummary | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmedRef = useRef(false);

  const previews = useMemo(
    () => photos.map((file) => URL.createObjectURL(file)),
    [photos],
  );

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  function handlePhotosChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const limited = selected.slice(0, MAX_ORDER_PHOTOS);
    setPhotos(limited);

    if (limited.length !== selected.length) {
      const transfer = new DataTransfer();
      limited.forEach((file) => transfer.items.add(file));
      event.target.files = transfer.files;
    }
  }

  function removePhoto(index: number) {
    const input = fileInputRef.current;
    const remaining = photos.filter((_, itemIndex) => itemIndex !== index);
    setPhotos(remaining);

    if (input) {
      const transfer = new DataTransfer();
      remaining.forEach((file) => transfer.items.add(file));
      input.files = transfer.files;
    }
  }

  function buildSummary(): OrderSummary {
    const form = formRef.current;
    const data = form ? new FormData(form) : new FormData();

    const serviceId = String(data.get("serviceId") ?? "");
    const serviceName =
      services.find((service) => service.id === serviceId)?.name ?? "-";

    const device = [
      String(data.get("deviceType") ?? ""),
      String(data.get("deviceBrand") ?? ""),
      String(data.get("deviceModel") ?? ""),
    ]
      .filter(Boolean)
      .join(" ");

    const schedule = String(data.get("preferredSchedule") ?? "");

    return {
      serviceName,
      device: device || "-",
      problemDescription: String(data.get("problemDescription") ?? "") || "-",
      address: String(data.get("address") ?? "") || "-",
      preferredSchedule: schedule
        ? formatDateTime(schedule)
        : "Fleksibel (belum ditentukan)",
      additionalNotes: String(data.get("additionalNotes") ?? "") || "-",
      photoCount: photos.length,
    };
  }

  function openConfirm() {
    setSummary(buildSummary());
    setConfirmOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }
    event.preventDefault();
    openConfirm();
  }

  function handleConfirm() {
    setConfirmOpen(false);
    confirmedRef.current = true;
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
    >
      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {state.message}
        </p>
      ) : null}

      <div>
        <Label htmlFor="serviceId">Layanan *</Label>
        <Select
          id="serviceId"
          name="serviceId"
          defaultValue={state.values?.serviceId ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.serviceId)}
        >
          <option value="" disabled>
            Pilih layanan...
          </option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </Select>
        <FieldError errors={state.fieldErrors?.serviceId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="deviceType">Jenis Perangkat *</Label>
          <Input
            id="deviceType"
            name="deviceType"
            type="text"
            placeholder="cth: Laptop, PC, Router"
            defaultValue={state.values?.deviceType ?? ""}
            aria-invalid={Boolean(state.fieldErrors?.deviceType)}
          />
          <FieldError errors={state.fieldErrors?.deviceType} />
        </div>
        <div>
          <Label htmlFor="deviceBrand">Merek</Label>
          <Input
            id="deviceBrand"
            name="deviceBrand"
            type="text"
            placeholder="cth: ASUS, Dell, TP-Link"
            defaultValue={state.values?.deviceBrand ?? ""}
          />
          <FieldError errors={state.fieldErrors?.deviceBrand} />
        </div>
        <div>
          <Label htmlFor="deviceModel">Model</Label>
          <Input
            id="deviceModel"
            name="deviceModel"
            type="text"
            placeholder="cth: VivoBook 14"
            defaultValue={state.values?.deviceModel ?? ""}
          />
          <FieldError errors={state.fieldErrors?.deviceModel} />
        </div>
      </div>

      <div>
        <Label htmlFor="problemDescription">Deskripsi Masalah *</Label>
        <Textarea
          id="problemDescription"
          name="problemDescription"
          rows={4}
          placeholder="Jelaskan kerusakan atau kendala secara detail..."
          defaultValue={state.values?.problemDescription ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.problemDescription)}
        />
        <FieldError errors={state.fieldErrors?.problemDescription} />
      </div>

      <div>
        <Label htmlFor="photos">Foto Masalah / Perangkat (opsional)</Label>
        <input
          ref={fileInputRef}
          id="photos"
          name="photos"
          type="file"
          accept={ORDER_PHOTO_MIME_TYPES.join(",")}
          multiple
          onChange={handlePhotosChange}
          className="block w-full cursor-pointer rounded-md border border-zinc-300 text-sm text-zinc-600 file:mr-4 file:cursor-pointer file:border-0 file:bg-zinc-100 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Maksimal {MAX_ORDER_PHOTOS} foto, {MAX_ORDER_PHOTO_BYTES / (1024 * 1024)}MB
          per foto (JPG, PNG, WEBP, GIF).
        </p>

        {photos.length > 0 ? (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((file, index) => (
              <li key={`${file.name}-${index}`} className="space-y-1">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previews[index]}
                    alt={file.name}
                    className="h-24 w-full rounded-md border border-zinc-200 object-cover dark:border-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    aria-label={`Hapus foto ${file.name}`}
                    className="absolute -right-2 -top-2 rounded-full bg-zinc-900 p-1 text-white shadow-sm transition-colors hover:bg-zinc-700"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </div>
                <p className="truncate text-xs text-zinc-500">{file.name}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        <Label htmlFor="address">Alamat (opsional)</Label>
        <Textarea
          id="address"
          name="address"
          rows={2}
          placeholder="Alamat untuk pengambilan/pengiriman, jika diperlukan."
          defaultValue={state.values?.address ?? ""}
        />
        <FieldError errors={state.fieldErrors?.address} />
      </div>

      <div>
        <Label htmlFor="preferredSchedule">Jadwal Diinginkan (opsional)</Label>
        <Input
          id="preferredSchedule"
          name="preferredSchedule"
          type="datetime-local"
          defaultValue={state.values?.preferredSchedule ?? ""}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Pilih tanggal dan jam yang Anda inginkan.
        </p>
        <FieldError errors={state.fieldErrors?.preferredSchedule} />
      </div>

      <div>
        <Label htmlFor="additionalNotes">Catatan Tambahan (opsional)</Label>
        <Textarea
          id="additionalNotes"
          name="additionalNotes"
          rows={3}
          placeholder="Informasi tambahan, misalnya riwayat kerusakan atau kondisi akses ke perangkat."
          defaultValue={state.values?.additionalNotes ?? ""}
        />
        <FieldError errors={state.fieldErrors?.additionalNotes} />
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center dark:border-zinc-800">
        <ReviewButton />
        <p className="text-xs text-zinc-500">
          Anda akan meninjau pesanan sebelum dikirim. Estimasi biaya disampaikan
          setelah diagnosa dan persetujuan.
        </p>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      >
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Konfirmasi Pesanan</DialogTitle>
          <DialogDescription>
            Periksa kembali detail pesanan Anda sebelum dikirim.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
        {summary ? (
          <dl>
            <SummaryRow label="Layanan">{summary.serviceName}</SummaryRow>
            <SummaryRow label="Perangkat">{summary.device}</SummaryRow>
            <SummaryRow label="Masalah">{summary.problemDescription}</SummaryRow>
            <SummaryRow label="Alamat">{summary.address}</SummaryRow>
            <SummaryRow label="Jadwal">{summary.preferredSchedule}</SummaryRow>
            <SummaryRow label="Catatan">{summary.additionalNotes}</SummaryRow>
            <SummaryRow label="Foto">
              {summary.photoCount > 0
                ? `${summary.photoCount} foto dilampirkan`
                : "Tidak ada foto"}
            </SummaryRow>
          </dl>
        ) : null}
        <p className="mt-4 text-xs text-zinc-500">
          Pesanan akan dibuat dengan status &quot;Menunggu Diterima&quot; dan nomor
          pesanan otomatis berformat SRV-YYYYMMDD-XXXX.
        </p>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmOpen(false)}
          >
            Batal
          </Button>
          <Button type="button" onClick={handleConfirm}>
            <CircleCheck className="h-4 w-4" aria-hidden />
            Kirim Pesanan
          </Button>
        </DialogFooter>
      </Dialog>
    </form>
  );
}