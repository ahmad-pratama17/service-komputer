import { CUSTOMER_NAV } from "@/lib/constants";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireCustomer } from "@/lib/auth/session";
import {
  getCustomerNotifications,
  getUnreadNotificationCount,
} from "@/lib/orders";
import { markAllReadAction } from "@/app/actions/notifications";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCustomer();

  const [unread, recentResult] = await Promise.all([
    getUnreadNotificationCount(user.id),
    getCustomerNotifications(user.id, 5),
  ]);

  return (
    <DashboardShell
      items={CUSTOMER_NAV}
      user={user}
      profileHref="/dashboard/profile"
      unreadNotifications={unread}
      recentNotifications={recentResult.ok ? recentResult.data : []}
      markAllNotificationsRead={markAllReadAction}
    >
      {children}
    </DashboardShell>
  );
}