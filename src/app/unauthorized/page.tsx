import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Akses Ditolak",
};

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>Akses Ditolak</CardTitle>
            <CardDescription>
              Anda tidak memiliki izin untuk membuka halaman ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/"
              className="font-medium text-blue-600 hover:underline"
            >
              Kembali ke beranda
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}