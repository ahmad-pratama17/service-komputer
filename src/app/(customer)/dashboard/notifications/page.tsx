import type { Metadata } from "next";
import { requireCustomer } from "@/lib/auth/session";
import { getCustomerNotifications } from "@/lib/orders";
import { NotificationList } from "@/components/customer/notification-list";
import { MarkAllReadButton } from "@/components/customer/mark-all-read-button";
import { Card, CardContent } from "@/components/ui/card";
import { DataErrorState } from "@/components/ui/data-error-state";

export const metadata: Metadata = {
  title: "Notifikasi",
};

export default async function NotificationsPage() {
  const user = await requireCustomer();
  const result = await getCustomerNotifications(user.id);
  const notifications = result.ok ? result.data : [];
  const unread = notifications.filter((item) => !item.is_read).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Notifikasi
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {unread > 0
              ? `${unread} notifikasi belum dibaca.`
              : "Semua notifikasi sudah dibaca."}
          </p>
        </div>
        <MarkAllReadButton unreadCount={unread} />
      </div>

      {result.ok ? (
        <Card>
          <CardContent className="px-5">
            <NotificationList notifications={notifications} />
          </CardContent>
        </Card>
      ) : (
        <DataErrorState message={result.error} />
      )}
    </div>
  );
}