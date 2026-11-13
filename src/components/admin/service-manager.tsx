"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil, Plus, Power, TriangleAlert, Wrench } from "lucide-react";
import {
  toggleServiceAction,
  upsertServiceAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SERVICE_CATEGORY_LABEL } from "@/lib/constants";
import { formatCurrency, formatDuration } from "@/lib/utils";
import type { ServiceCategory } from "@/types";

export type AdminServiceRow = {
  id: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  starting_price: number;
  estimated_duration: number;
  is_active: boolean;
  order_count: number;
};

type ServiceFormValues = {
  serviceId?: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  startingPrice: number;
  estimatedDuration: number;
  isActive: boolean;
};

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Layanan"}
    </Button>
  );
}

function ToggleButton({ active }: { active: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      className="px-2"
      aria-label={active ? "Nonaktifkan layanan" : "Aktifkan layanan"}
      title={active ? "Nonaktifkan layanan" : "Aktifkan layanan"}
    >
      <Power className="h-4 w-4" aria-hidden />
    </Button>
  );
}

function ServiceDialog({
  open,
  onOpenChange,
  service,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceFormValues;
}) {
  const isEdit = Boolean(service?.serviceId);
  const [state, formAction] = useActionState<
    AdminActionState | null,
    FormData
  >(upsertServiceAction, null);

  useEffect(() => {
    if (state?.ok && isEdit) {
      onOpenChange(false);
    }
  }, [state, isEdit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose />
      <DialogHeader>
        <DialogTitle>{isEdit ? "Ubah Layanan" : "Layanan Baru"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Perbarui informasi layanan yang sudah ada."
            : "Tambahkan layanan yang bisa dipilih pelanggan."}
        </DialogDescription>
      </DialogHeader>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="serviceId" value={service?.serviceId ?? ""} />

        <div className="space-y-1.5">
          <Label htmlFor="service-name">Nama layanan</Label>
          <Input
            id="service-name"
            name="name"
            required
            minLength={3}
            maxLength={120}
            defaultValue={service?.name ?? ""}
            placeholder="Contoh: Perbaikan Komputer Desktop"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="service-category">Kategori</Label>
          <Select
            id="service-category"
            name="category"
            defaultValue={service?.category ?? "computer_repair"}
          >
            {(Object.keys(SERVICE_CATEGORY_LABEL) as ServiceCategory[]).map(
              (category) => (
                <option key={category} value={category}>
                  {SERVICE_CATEGORY_LABEL[category]}
                </option>
              ),
            )}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="service-price">Harga mulai (Rp)</Label>
            <Input
              id="service-price"
              name="startingPrice"
              type="number"
              required
              min={0}
              step={1000}
              defaultValue={service?.startingPrice ?? 50000}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="service-duration">Estimasi durasi (jam)</Label>
            <Input
              id="service-duration"
              name="estimatedDuration"
              type="number"
              required
              min={1}
              max={1000}
              defaultValue={service?.estimatedDuration ?? 4}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="service-description">Deskripsi</Label>
          <Textarea
            id="service-description"
            name="description"
            maxLength={1000}
            defaultValue={service?.description ?? ""}
            placeholder="Jelaskan singkat cakupan pekerjaan layanan ini."
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={service?.isActive ?? true}
            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          Aktif dan bisa dipesan pelanggan
        </label>

        {state && !state.ok ? (
          <p
            className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            role="status"
          >
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {state.message}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <SubmitButton isEdit={isEdit} />
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function toFormValues(service: AdminServiceRow): ServiceFormValues {
  return {
    serviceId: service.id,
    name: service.name,
    description: service.description,
    category: service.category,
    startingPrice: service.starting_price,
    estimatedDuration: service.estimated_duration,
    isActive: service.is_active,
  };
}

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      Aktif
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
      Nonaktif
    </span>
  );
}

export function ServiceManager({ services }: { services: AdminServiceRow[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceFormValues | undefined>();

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  const openEdit = (service: AdminServiceRow) => {
    setEditing(toFormValues(service));
    setDialogOpen(true);
  };

  return (
    <>
      <div className="flex justify-end border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          Layanan Baru
        </Button>
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Layanan</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Harga Mulai</TableHead>
              <TableHead className="text-right">Durasi</TableHead>
              <TableHead className="text-right">Pesanan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="max-w-64">
                  <span className="block truncate font-medium">{service.name}</span>
                  {service.description ? (
                    <span className="mt-0.5 block truncate text-xs text-zinc-400">
                      {service.description}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-xs">
                  {SERVICE_CATEGORY_LABEL[service.category]}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {formatCurrency(service.starting_price)}
                </TableCell>
                <TableCell className="text-right text-xs whitespace-nowrap">
                  {formatDuration(service.estimated_duration)}
                </TableCell>
                <TableCell className="text-right text-xs">
                  {service.order_count}
                </TableCell>
                <TableCell>
                  <ActiveBadge active={service.is_active} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <form action={toggleServiceAction}>
                      <input type="hidden" name="serviceId" value={service.id} />
                      <ToggleButton active={service.is_active} />
                    </form>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(service)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                      Ubah
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y divide-zinc-200 md:hidden dark:divide-zinc-800">
        {services.map((service) => (
          <li key={service.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {service.name}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {SERVICE_CATEGORY_LABEL[service.category]} ·{" "}
                  {formatDuration(service.estimated_duration)}
                </p>
              </div>
              <ActiveBadge active={service.is_active} />
            </div>

            {service.description ? (
              <p className="line-clamp-2 text-xs text-zinc-500">
                {service.description}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(service.starting_price)}
                </p>
                <p className="text-xs text-zinc-400">
                  {service.order_count} pesanan
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={toggleServiceAction}>
                  <input type="hidden" name="serviceId" value={service.id} />
                  <ToggleButton active={service.is_active} />
                </form>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(service)}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Ubah
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <ServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        service={editing}
      />
    </>
  );
}

export function ServiceEmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
        <Wrench className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Belum ada layanan
      </p>
      <p className="max-w-sm text-sm text-zinc-500">
        Tambahkan layanan pertama agar pelanggan bisa membuat pesanan.
      </p>
    </div>
  );
}
