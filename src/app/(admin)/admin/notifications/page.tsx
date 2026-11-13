import type { Metadata } from "next";
import { BellOff } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminNotificationFeed } from "@/components/admin/admin-notification-feed";
import { DrainOutboxButton } from "@/components/admin/drain-outbox-button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { getAdminNotifications } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Notifikasi Admin",
};

export default async function AdminNotificationsPage() {
  const user = await requireAdmin();
  const result = await getAdminNotifications(user.id);
  const notifications = result.ok ? result.data : [];

  const unread = notifications.filter((item) => !item.is_read).length;

  return (
    <AdminPageShell>
      <PageHeader
        title="Notifikasi"
        description={
          unread > 0
            ? `${unread} notifikasi belum dibaca.`
            : "Semua notifikasi sudah dibaca."
        }
        actions={<DrainOutboxButton />}
      />

      <Card className="p-4 sm:p-6">
        {!result.ok ? (
          <EmptyState title={result.error} />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<BellOff className="h-5 w-5" aria-hidden />}
            title="Belum ada notifikasi"
            description="Notifikasi pesanan baru dan aktivitas penting akan muncul di sini."
          />
        ) : (
          <AdminNotificationFeed notifications={notifications} />
        )}
      </Card>
    </AdminPageShell>
  );
}
