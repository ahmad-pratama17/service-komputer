import Link from "next/link";
import {
  AppWindow,
  Database,
  Headphones,
  Settings,
  Wifi,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { PublicService } from "@/lib/services";
import type { ServiceCategory } from "@/types";
import { SERVICE_CATEGORY_LABEL } from "@/lib/constants";
import { formatCurrency, formatDuration } from "@/lib/utils";

const CATEGORY_ICON: Record<ServiceCategory, LucideIcon> = {
  computer_repair: Wrench,
  network: Wifi,
  software: AppWindow,
  it_support: Headphones,
  data_recovery: Database,
  maintenance: Settings,
};

export function ServiceCard({ service }: { service: PublicService }) {
  const Icon = CATEGORY_ICON[service.category];

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {SERVICE_CATEGORY_LABEL[service.category]}
        </span>
      </div>

      <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {service.name}
      </h3>
      <p className="mb-6 flex-1 text-sm text-zinc-600 dark:text-zinc-400">
        {service.description}
      </p>

      <div className="mb-6 flex items-center justify-between text-sm">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {formatCurrency(service.starting_price)}
        </span>
        <span className="text-zinc-500">
          {formatDuration(service.estimated_duration)}
        </span>
      </div>

      <Link
        href="/register"
        className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        Pesan Service Ini
      </Link>
    </div>
  );
}