import {
  Bell,
  ClipboardList,
  CreditCard,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import type { CustomerNotification } from "@/lib/orders";
import type { NotificationType } from "@/types";
import { NOTIFICATION_TYPE_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { MarkReadButton } from "@/components/customer/mark-read-button";
import { EmptyState } from "@/components/ui/empty-state";

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  order: ClipboardList,
  invoice: ReceiptText,
  payment: CreditCard,
  system: Bell,
};

export function NotificationList({
  notifications,
}: {
  notifications: CustomerNotification[];
}) {
  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="h-5 w-5" aria-hidden />}
        title="Belum ada notifikasi"
        description="Pemberitahuan pesanan dan pembayaran akan muncul di sini."
      />
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {notifications.map((notification) => {
        const Icon = TYPE_ICON[notification.type];
        return (
          <li key={notification.id} className="flex items-start gap-3 py-4">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                notification.is_read
                  ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {notification.title}
                </p>
                {!notification.is_read ? (
                  <span
                    aria-label="Belum dibaca"
                    className="h-2 w-2 shrink-0 rounded-full bg-blue-600"
                  />
                ) : null}
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {notification.message}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-zinc-400">
                  {NOTIFICATION_TYPE_LABEL[notification.type]} ·{" "}
                  {formatDateTime(notification.created_at)}
                </p>
                {!notification.is_read ? (
                  <MarkReadButton notificationId={notification.id} />
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}