import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { buttonClassName } from "@/components/ui/button";

export const metadata = {
  title: "Halaman tidak ditemukan",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
        <FileQuestion className="h-6 w-6" aria-hidden />
      </span>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Halaman tidak ditemukan
        </h1>
        <p className="text-sm text-zinc-500">
          Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={buttonClassName("primary", "sm")}>
          Kembali ke beranda
        </Link>
        <Link href="/services" className={buttonClassName("outline", "sm")}>
          Lihat layanan
        </Link>
      </div>

      <p className="pt-2 text-xs text-zinc-400">{APP_NAME}</p>
    </div>
  );
}