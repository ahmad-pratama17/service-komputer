import type { Metadata } from "next";
import { TeknisiPageShell } from "@/components/teknisi/teknisi-page-shell";
import { StaffAiChat } from "@/components/staff/staff-ai-chat";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "AI Asisten",
};

const SUGGESTIONS = [
  "Pesanan apa saja yang perlu saya kerjakan?",
  "Tampilkan pesanan yang masih pending",
  "Cari pelanggan bernama Siti",
  "Layanan apa saja yang tersedia?",
];

/**
 * Asisten operasional teknisi: sama seperti milik admin, tetapi tanpa
 * angka keuangan agregat (ditolak di server bila diminta).
 */
export default async function TeknisiAssistantPage() {
  await requireStaff();

  return (
    <TeknisiPageShell>
      <PageHeader
        title="AI Asisten"
        description="Tanyakan antrean pengerjaan, detail pesanan, layanan, atau pelanggan."
      />

      <Card>
        <CardContent className="pt-6">
          <StaffAiChat role="teknisi" suggestions={SUGGESTIONS} />
        </CardContent>
      </Card>
    </TeknisiPageShell>
  );
}
