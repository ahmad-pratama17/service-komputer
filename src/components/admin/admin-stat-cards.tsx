import {
  ReceiptText,
  TrendingUp,
  Wrench,
  Inbox,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminStats } from "@/lib/admin";
import { formatCurrency } from "@/lib/utils";

type AdminStatCardsProps = {
  stats: AdminStats;
};

const iconClass = "h-6 w-6";

const toneStyles: Record<
  string,
  { icon: string; value: string }
> = {
  info: {
    icon: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300",
    value: "text-zinc-900 dark:text-zinc-100",
  },
  warning: {
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
    value: "text-amber-700 dark:text-amber-300",
  },
  success: {
    icon:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
    value: "text-emerald-700 dark:text-emerald-300",
  },
  danger: {
    icon: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300",
    value: "text-red-700 dark:text-red-300",
  },
};

export function AdminStatCards({ stats }: AdminStatCardsProps) {
  const cards: {
    label: string;
    value: string;
    hint: string;
    icon: LucideIcon;
    tone: keyof typeof toneStyles;
  }[] = [
    {
      label: "Total Pesanan",
      value: String(stats.totalOrders),
      hint: "Seluruh pesanan masuk",
      icon: Inbox,
      tone: "info",
    },
    {
      label: "Pesanan Menunggu",
      value: String(stats.pendingOrders),
      hint: "Perlu ditinjau admin",
      icon: AlertCircle,
      tone: "warning",
    },
    {
      label: "Service Aktif",
      value: String(stats.activeServices),
      hint: "Layanan tersedia dipesan",
      icon: Wrench,
      tone: "info",
    },
    {
      label: "Pesanan Selesai",
      value: String(stats.completedServices),
      hint: "Selesai, dibayar, atau ditutup",
      icon: CheckCircle2,
      tone: "success",
    },
    {
      label: "Tagihan Belum Lunas",
      value: String(stats.unpaidInvoices),
      hint: "Belum dan sebagian dibayar",
      icon: ReceiptText,
      tone: "danger",
    },
    {
      label: "Pendapatan",
      value: formatCurrency(stats.revenue),
      hint: "Total invoice lunas",
      icon: TrendingUp,
      tone: "success",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const tone = toneStyles[card.tone];
        return (
          <Card key={card.label}>
            <CardContent className="flex items-start gap-4 p-5">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}
              >
                <card.icon className={iconClass} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {card.label}
                </p>
                <p
                  className={`mt-1 truncate text-2xl font-bold ${tone.value}`}
                >
                  {card.value}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-400">
                  {card.hint}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
