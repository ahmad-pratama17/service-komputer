import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/lib/auth/session";
import {
  getAdminNotifications,
  getAdminUnreadNotificationCount,
} from "@/lib/admin";
import { TEKNISI_NAV_SECTIONS } from "@/lib/teknisi-nav";
import { markAllReadAction } from "@/app/actions/notifications";

/**
 * Wrapper server untuk panel teknisi. Memakai ulang AdminShell dengan
 * navigasi, judul, dan tujuan lonceng versi teknisi — tidak ada duplikasi
 * markup sidebar/header.
 */
export async function TeknisiPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaff();

  const [unread, recentResult] = await Promise.all([
    getAdminUnreadNotificationCount(user.id),
    getAdminNotifications(user.id, 5),
  ]);

  return (
    <AdminShell
      sections={TEKNISI_NAV_SECTIONS}
      user={user}
      unreadNotifications={unread}
      recentNotifications={recentResult.ok ? recentResult.data : []}
      markAllNotificationsRead={markAllReadAction}
      title="Panel Teknisi"
      notificationsHref="/teknisi/notifications"
      brandLabel="Teknisi"
      rootHref="/teknisi"
      navLabel="Navigasi teknisi"
    >
      {children}
    </AdminShell>
  );
}
