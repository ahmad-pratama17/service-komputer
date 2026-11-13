"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bot,
  ClipboardList,
  ReceiptText,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminNavIcon, AppNavItem } from "@/types";

const iconClass = "h-4 w-4 shrink-0";

export type AdminNavSection = {
  heading: string;
  items: (AppNavItem & { icon: AdminNavIcon })[];
};

type AdminSidebarProps = {
  sections: AdminNavSection[];
  open: boolean;
  onClose: () => void;
  /** Label merek di kepala sidebar. Default "Admin". */
  brandLabel?: string;
  /** Root area untuk status aktif. Default "/admin". */
  rootHref?: string;
  /** Label aria navigasi. Default "Navigasi admin". */
  navLabel?: string;
};

function NavIcon({ name }: { name: AdminNavIcon }) {
  switch (name) {
    case "orders":
      return <ClipboardList className={iconClass} aria-hidden />;
    case "customers":
      return <Users className={iconClass} aria-hidden />;
    case "services":
      return <Wrench className={iconClass} aria-hidden />;
    case "invoices":
      return <ReceiptText className={iconClass} aria-hidden />;
    case "notifications":
      return <Bell className={iconClass} aria-hidden />;
    case "assistant":
      return <Bot className={iconClass} aria-hidden />;
  }
}

function isActive(pathname: string, href: string, rootHref: string) {
  if (href === rootHref) {
    return pathname === rootHref;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  sections,
  open,
  onClose,
  brandLabel = "Admin",
  rootHref = "/admin",
  navLabel = "Navigasi admin",
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-zinc-900/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:translate-x-0 dark:border-zinc-800 dark:bg-zinc-950 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label={navLabel}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800">
          <span className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
              <Wrench className="h-5 w-5" aria-hidden />
            </span>
            {brandLabel}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onClose}
            aria-label="Tutup menu navigasi"
          >
            <X className="h-5 w-5" aria-hidden />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          {sections.map((section) => (
            <div key={section.heading} className="mb-6 last:mb-0">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {section.heading}
              </p>
              <ul className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href, rootHref);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <NavIcon name={item.icon} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
