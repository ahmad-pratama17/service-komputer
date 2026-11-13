import type { Metadata } from "next";
import { Bot, ShieldCheck, TriangleAlert } from "lucide-react";
import { requireCustomer } from "@/lib/auth/session";
import { getAiHistory } from "@/lib/ai/conversations";
import { isAiConfigured } from "@/lib/ai/openai";
import { isDemoMode } from "@/lib/demo/mode";
import { AiChat } from "@/components/customer/ai-chat";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "AI Assistant",
};

export default async function AiAssistantPage() {
  const user = await requireCustomer();
  const messages = await getAiHistory(user.id);
  const demo = isDemoMode();
  const aiEnabled = demo || isAiConfigured();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          <Bot className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden />
          AI Assistant
        </h1>
        <p className="text-sm text-zinc-500">
          Bantuan awal untuk memahami masalah perangkat dan memilih layanan yang
          tepat.
        </p>
      </header>

      {demo ? (
        <p
          className="flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
          role="status"
        >
          <Bot className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Mode demo lokal: jawaban dihasilkan aturan sederhana di server ini,
          bukan model AI. Alur chat-nya sama; kualitas jawabannya beda.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Percakapan dengan assistant</CardTitle>
          <CardDescription>
            Jawabannya bersifat gambaran umum, bukan diagnosis pasti.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AiChat messages={messages} aiEnabled={aiEnabled} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck
              className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
            Batasan dan privasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            AI tidak dapat membuat, mengubah, atau membatalkan pesanan Anda.
            Semua perubahan tetap dilakukan lewat halaman pemesanan resmi.
          </p>
          <p>
            Untuk masalah yang perlu pemeriksaan langsung, buat service order agar
            teknisi kami dapat memeriksa perangkat secara langsung.
          </p>
          <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Jangan mengirim data sensitif seperti kata sandi, nomor kartu, atau
            informasi pribadi di sini.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
