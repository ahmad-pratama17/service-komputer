import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { StaffAiChat } from "@/components/staff/staff-ai-chat";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "AI Asisten",
};

const SUGGESTIONS = [
  "Pesanan apa saja yang masih pending?",
  "Berapa total tagihan yang belum dibayar?",
  "Cari pelanggan bernama Siti",
  "Layanan apa saja yang tersedia?",
];

/**
 * Asisten operasional admin: tanya-jawab berbasis data (bukan analisis
 * per pesanan — itu tetap di kartu AI Copilot pada detail pesanan).
 * Stateless: percakapan hanya hidup di browser sesi ini.
 */
export default async function AdminAssistantPage() {
  await requireAdmin();

  return (
    <AdminPageShell>
      <PageHeader
        title="AI Asisten"
        description="Tanyakan antrean pesanan, tagihan, layanan, atau pelanggan — AI membacakan datanya."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <StaffAiChat role="admin" suggestions={SUGGESTIONS} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bot
                className="h-4 w-4 text-blue-600 dark:text-blue-400"
                aria-hidden
              />
              Butuh analisis mendalam?
            </CardTitle>
            <CardDescription>
              Asisten ini menjawab dari data. Untuk analisis satu pesanan
              (dugaan penyebab, rekomendasi pemeriksaan), pakai AI Copilot
              pada detail pesanan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Buka daftar pesanan
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
