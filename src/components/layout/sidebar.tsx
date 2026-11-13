"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  User,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppNavItem } from "@/types";

type SidebarProps = {
  items: AppNavItem[];
  open?: boolean;
  onClose?: () => void;
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  "clipboard-list": ClipboardList,
  "credit-card": CreditCard,
  bell: Bell,
  user: User,
};

function NavIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Comp = ICON_MAP[name] ?? LayoutDashboard;
  return <Comp className={className} aria-hidden />;
}

/**
 * `/dashboard` tidak boleh aktif hanya karena menjadi prefix dari
 * `/dashboard/services`, jadi pencocokan root harus persis.
 */
function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sidebar customer. Tersembunyi di layar kecil dan dibuka lewat tombol
 * hamburger di header (dikontrol oleh parent DashboardShell).
 */
export function Sidebar({ items, open = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-zinc-900/50 lg:hidden"
          onClick={() => onClose?.()}
          aria-hidden
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 dark:border-zinc-800 dark:bg-zinc-950 ${open ? "translate-x-0" : "-translate-x-full"
          }`}
        aria-label="Navigasi pelanggan"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800">
          <span className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
              <Wrench className="h-5 w-5" aria-hidden />
            </span>
            Pelanggan
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => onClose?.()}
            aria-label="Tutup menu navigasi"
          >
            <X className="h-5 w-5" aria-hidden />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => onClose?.()}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${active
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      }`}
                  >
                    {item.icon ? (
                      <span
                        className="flex shrink-0 items-center text-zinc-600 dark:text-zinc-400"
                        aria-hidden
                      >
                        <NavIcon name={item.icon} className="h-4 w-4" />
                      </span>
                    ) : null}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
