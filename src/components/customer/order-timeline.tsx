"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { OrderHistoryItem } from "@/lib/orders";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

const REFRESH_INTERVAL_MS = 30_000;

/**
 * Timeline status dengan refresh otomatis supaya progres pesanan terlihat
 * tanpa perlu memuat ulang halaman. Poll hanya jalan saat tab aktif.
 */
export function OrderTimeline({ history }: { history: OrderHistoryItem[] }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, REFRESH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  if (history.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Belum ada riwayat status untuk pesanan ini.
      </p>
    );
  }

  return (
    <ol className="space-y-0">
      {history.map((item, index) => {
        const isLast = index === history.length - 1;
        return (
          <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast ? (
              <span
                aria-hidden
                className="absolute left-[11px] top-6 h-full w-px bg-zinc-200 dark:bg-zinc-800"
              />
            ) : null}
            <span
              aria-hidden
              className="relative mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-blue-600 bg-white dark:bg-zinc-900"
            >
              <span className="h-2 w-2 rounded-full bg-blue-600" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {ORDER_STATUS_LABEL[item.new_status]}
                </p>
                <time className="text-xs text-zinc-400">
                  {formatDateTime(item.created_at)}
                </time>
              </div>
              {item.note ? (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {item.note}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}