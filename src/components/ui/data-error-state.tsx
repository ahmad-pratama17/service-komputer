import { TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type DataErrorStateProps = {
  /** Pesan dari server, mis. "Gagal memuat pesanan." */
  message?: string;
};

/**
 * Error state untuk halaman yang gagal memuat data dari Supabase.
 *
 * Sebelumnya blok yang sama ditulis ulang di lima halaman customer dengan
 * teks dan struktur identik, sehingga perbaikannya harus diulang lima kali.
 */
export function DataErrorState({ message }: DataErrorStateProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-6">
        <TriangleAlert
          className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
          aria-hidden
        />
        <div>
          <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
            {message ?? "Gagal memuat data."}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Silakan muat ulang halaman untuk mencoba kembali.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}