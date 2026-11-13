"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AdminSidebar, type AdminNavSection } from "@/components/admin/admin-sidebar";
import { NotificationBell } from "@/components/layout/notification-bell";
import type { NotificationPreview } from "@/lib/notifications/types";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";

type AdminShellProps = {
  sections: AdminNavSection[];
  user: { name: string; email: string };
  unreadNotifications?: number;
  recentNotifications?: NotificationPreview[];
  markAllNotificationsRead?: () => Promise<void>;
  /** Judul panel. Default "Panel Admin"; panel teknisi memakai "Panel Teknisi". */
  title?: string;
  /** Tujuan lonceng notifikasi. Default "/admin/notifications". */
  notificationsHref?: string;
  /** Label merek sidebar + root aktif. Default "Admin" dan "/admin". */
  brandLabel?: string;
  rootHref?: string;
  /** Label aria navigasi. Default "Navigasi admin". */
  navLabel?: string;
  children: React.ReactNode;
};

export function AdminShell({
  sections,
  user,
  unreadNotifications = 0,
  recentNotifications = [],
  markAllNotificationsRead,
  title = "Panel Admin",
  notificationsHref = "/admin/notifications",
  brandLabel = "Admin",
  rootHref = "/admin",
  navLabel = "Navigasi admin",
  children,
}: AdminShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AdminSidebar
        sections={sections}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        brandLabel={brandLabel}
        rootHref={rootHref}
        navLabel={navLabel}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur sm:px-6 dark:border-zinc-800 dark:bg-zinc-950/90">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Buka menu navigasi"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </Button>
            <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {title}
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            {markAllNotificationsRead ? (
              <NotificationBell
                href={notificationsHref}
                notifications={recentNotifications}
                unreadCount={unreadNotifications}
                markAllRead={markAllNotificationsRead}
              />
            ) : null}

            <div className="hidden min-w-0 max-w-56 text-right sm:block">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {user.name}
              </p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

