import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
};

export function StatCard({ icon: Icon, label, value, hint }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {value}
          </p>
          {hint ? (
            <p className="mt-0.5 truncate text-xs text-zinc-400">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}