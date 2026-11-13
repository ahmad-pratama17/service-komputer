"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";

/**
 * Error boundary untuk seluruh area admin.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hanya ke console browser saat development. `digest` adalah identifier
    // dari server; `message` sengaja tidak pernah dirender ke DOM, jadi
    // detail error tidak bocor ke pengguna.
    if (process.env.NODE_ENV !== "production") {
      console.error("Admin route error:", error.digest ?? error.message);
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <AlertTriangle
          className="mx-auto h-10 w-10 text-amber-500"
          aria-hidden
        />
        <h1 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Halaman tidak dapat dimuat
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Terjadi kesalahan saat memuat data admin. Coba lagi bila masalah
          berlanjut.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className={buttonClassName("primary", "sm")}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Coba lagi
          </button>
          <a href="/admin" className={buttonClassName("outline", "sm")}>
            Ke dashboard admin
          </a>
        </div>
      </div>
    </div>
  );
}