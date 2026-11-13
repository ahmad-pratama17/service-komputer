"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CircleCheck, Trash2, TriangleAlert, Upload } from "lucide-react";
import {
  deleteResultPhotoAction,
  uploadResultPhotosAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/utils";
import { MAX_ORDER_PHOTOS, ORDER_PHOTO_MIME_TYPES } from "@/lib/constants";
import type { AdminOrderPhoto } from "@/lib/admin";

type ResultPhotosPanelProps = {
  orderId: string;
  photos: AdminOrderPhoto[];
};

type ResultPhoto = { id: string; fileName: string; url: string | null };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending}>
      <Upload className="h-4 w-4" aria-hidden />
      {pending ? "Mengunggah..." : "Unggah Foto Hasil"}
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

function DeletePhotoButton({ photo }: { photo: ResultPhoto }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`Hapus foto ${photo.fileName}`}
    >
      <Trash2 className="h-4 w-4" aria-hidden />
      {pending ? "Menghapus..." : "Hapus"}
    </Button>
  );
}

export function ResultPhotosPanel({ orderId, photos }: ResultPhotosPanelProps) {
  const [state, formAction] = useActionState<
    AdminActionState | null,
    FormData
  >(uploadResultPhotosAction, null);
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_ORDER_PHOTOS - photos.length;

  // Setelah unggahan sukses, form di-remount lewat resetKey supaya input file
  // dikosongkan dan file lama tidak terkirim ulang.
  const [resetKey, setResetKey] = useState(0);
  const [handledState, setHandledState] = useState<AdminActionState | null>(
    null,
  );

  if (state && state !== handledState) {
    setHandledState(state);
    if (state.ok) {
      setResetKey((key) => key + 1);
      setFiles([]);
    }
  }

  function handleFilesChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ): void {
    const selected = Array.from(event.target.files ?? []);
    const limited = selected.slice(0, remaining);

    setFiles(limited);

    if (limited.length !== selected.length) {
      const transfer = new DataTransfer();
      limited.forEach((file) => transfer.items.add(file));
      event.target.value = "";
      if (inputRef.current) {
        inputRef.current.files = transfer.files;
      }
    }
  }

  return (
    <div className="space-y-4">
      <form
        key={resetKey}
        action={formAction}
        className="space-y-3"
      >
        <input type="hidden" name="orderId" value={orderId} />

        {remaining > 0 ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="resultPhotos">
                Tambah foto hasil ({remaining} slot tersisa)
              </Label>
              <input
                ref={inputRef}
                id="resultPhotos"
                name="resultPhotos"
                type="file"
                accept={ORDER_PHOTO_MIME_TYPES.join(",")}
                multiple
                onChange={handleFilesChange}
                className="block w-full cursor-pointer rounded-md border border-zinc-300 text-sm text-zinc-600 file:mr-4 file:cursor-pointer file:border-0 file:bg-zinc-100 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
              />
              <p className="text-xs text-zinc-500">
                Maksimal {MAX_ORDER_PHOTOS} foto hasil per pesanan. Foto
                otomatis terlihat oleh customer.
              </p>
            </div>

            {files.length > 0 ? (
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                {files.map((file) => (
                  <li key={`${file.name}-${file.size}`}>
                    {file.name} ({(file.size / 1024).toFixed(0)} KB)
                  </li>
                ))}
              </ul>
            ) : null}

            <StatusMessage state={state} />

            <SubmitButton disabled={files.length === 0} />
          </>
        ) : (
          <p className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
            Kuota {MAX_ORDER_PHOTOS} foto hasil sudah penuh. Hapus foto yang ada
            untuk menambah foto baru.
          </p>
        )}
      </form>

      {photos.length > 0 ? (
        <ul className="space-y-3">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="flex flex-col gap-3 rounded-md border border-zinc-200 p-3 sm:flex-row sm:items-start dark:border-zinc-800"
            >
              {photo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.url}
                  alt={`Foto hasil ${photo.fileName}`}
                  className="h-24 w-24 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-md bg-zinc-100 text-xs text-zinc-500 dark:bg-zinc-800">
                  Pratinjau tidak tersedia
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium">{photo.fileName}</p>
                <p className="text-xs text-zinc-500">
                  Diunggah {formatDateTime(photo.createdAt)}
                </p>
              </div>

              <form action={deleteResultPhotoAction}>
                <input type="hidden" name="photoId" value={photo.id} />
                <DeletePhotoButton photo={photo} />
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">Belum ada foto hasil.</p>
      )}
    </div>
  );
}
