"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import type { AppNavItem } from "@/types";
import type { NotificationPreview } from "@/lib/notifications/types";
import { Sidebar } from "@/components/layout/sidebar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";

type DashboardShellProps = {
  items: AppNavItem[];
  user: { name: string; email: string };
  profileHref?: string;
  unreadNotifications?: number;
  recentNotifications?: NotificationPreview[];
  markAllNotificationsRead?: () => Promise<void>;
  children: React.ReactNode;
};

export function DashboardShell({
  items,
  user,
  profileHref,
  unreadNotifications = 0,
  recentNotifications = [],
  markAllNotificationsRead,
  children,
}: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nameContent = (
    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
      {user.name}
    </p>
  );

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        items={items}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur sm:gap-4 sm:px-6 dark:border-zinc-800 dark:bg-zinc-950/90">
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
          </div>
          {markAllNotificationsRead ? (
            <NotificationBell
              href="/dashboard/notifications"
              notifications={recentNotifications}
              unreadCount={unreadNotifications}
              markAllRead={markAllNotificationsRead}
            />
          ) : null}
          <div className="min-w-0 max-w-56 text-right">
            {profileHref ? (
              <Link href={profileHref} className="block hover:underline">
                {nameContent}
              </Link>
            ) : (
              nameContent
            )}
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>
          <LogoutButton />
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
