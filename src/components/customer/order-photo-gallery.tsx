import type { OrderPhoto } from "@/lib/orders";
import { ImageOff } from "lucide-react";

export function OrderPhotoGallery({ photos }: { photos: OrderPhoto[] }) {
  if (photos.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Tidak ada foto yang dilampirkan pada pesanan ini.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((photo) => (
        <li key={photo.id} className="space-y-1">
          {photo.url ? (
            <a href={photo.url} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.fileName}
                className="h-28 w-full rounded-md border border-zinc-200 object-cover transition-opacity hover:opacity-90 dark:border-zinc-800"
              />
            </a>
          ) : (
            <div className="flex h-28 w-full items-center justify-center rounded-md border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700">
              <ImageOff className="h-5 w-5" aria-hidden />
            </div>
          )}
          <p className="truncate text-xs text-zinc-500">{photo.fileName}</p>
        </li>
      ))}
    </ul>
  );
}