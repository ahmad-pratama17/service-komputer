"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import {
  markAdminNotificationsReadAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { NotificationType } from "@/types";

type AdminNotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
};

function ReadAllButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      <CheckCheck className="h-4 w-4" aria-hidden />
      {pending ? "Memproses..." : "Tandai semua dibaca"}
    </Button>
  );
}

export function AdminNotificationFeed({
  notifications,
}: {
  notifications: AdminNotificationItem[];
}) {
  const [, formAction] = useActionState<
    AdminActionState | null,
    FormData
  >(markAdminNotificationsReadAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex justify-end">
        <ReadAllButton />
      </div>

      <ul className="space-y-2">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={
              notification.is_read
                ? "rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                : "rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/30"
            }
          >
            <div className="flex items-start gap-3">
              <span
                className={
                  notification.is_read
                    ? "mt-0.5 text-zinc-400"
                    : "mt-0.5 text-blue-600 dark:text-blue-400"
                }
              >
                {notification.is_read ? (
                  <Bell className="h-4 w-4" aria-hidden />
                ) : (
                  <BellRing className="h-4 w-4" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {notification.title}
                  </p>
                  <p className="text-xs whitespace-nowrap text-zinc-400">
                    {formatDateTime(notification.created_at)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {notification.message}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </form>
  );
}
