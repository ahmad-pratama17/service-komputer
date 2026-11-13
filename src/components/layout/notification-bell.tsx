"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import type { NotificationPreview } from "@/lib/notifications/types";
import { NOTIFICATION_TYPE_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

type NotificationBellProps = {
  /** Halaman notifikasi lengkap. */
  href: string;
  notifications: NotificationPreview[];
  unreadCount: number;
  /** Server action yang menandai semua notifikasi milik pengguna ini terbaca. */
  markAllRead: () => Promise<void>;
};

export function NotificationBell({
  href,
  notifications,
  unreadCount,
  markAllRead,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Menutup dropdown saat klik di luar atau menekan Escape.
  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const label =
    unreadCount > 0
      ? `Notifikasi, ${unreadCount} belum dibaca`
      : "Notifikasi";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={label}
        className="relative rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 origin-top-right rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Notifikasi
            </p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await markAllRead();
                  })
                }
                disabled={pending}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                {pending ? "Menyimpan..." : "Tandai semua dibaca"}
              </button>
            ) : null}
          </div>

          {notifications.length === 0 ? (
            <p className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-zinc-500">
              <BellOff className="h-5 w-5" aria-hidden />
              Belum ada notifikasi
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-800">
              {notifications.map((item) => (
                <li
                  key={item.id}
                  className={`px-4 py-3 ${
                    item.is_read
                      ? ""
                      : "bg-blue-50/60 dark:bg-blue-950/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {item.title}
                    </p>
                    {!item.is_read ? (
                      <span
                        aria-label="Belum dibaca"
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600"
                      />
                    ) : null}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {item.message}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {NOTIFICATION_TYPE_LABEL[item.type]} ·{" "}
                    {formatDateTime(item.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
            <Link
              href={href}
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Lihat semua notifikasi
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}