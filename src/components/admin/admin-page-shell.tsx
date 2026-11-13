import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/session";
import {
  getAdminNotifications,
  getAdminUnreadNotificationCount,
} from "@/lib/admin";
import { ADMIN_NAV_SECTIONS } from "@/lib/admin-nav";
import { markAllReadAction } from "@/app/actions/notifications";

/**
 * Wrapper server untuk AdminShell.
 *
 * Setiap halaman admin memakai shell-nya sendiri, jadi badge notifikasi harus
 * dihitung di satu tempat supaya konsisten di semua halaman — bukan hanya di
 * /admin/notifications.
 */
export async function AdminPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  const [unread, recentResult] = await Promise.all([
    getAdminUnreadNotificationCount(user.id),
    getAdminNotifications(user.id, 5),
  ]);

  return (
    <AdminShell
      sections={ADMIN_NAV_SECTIONS}
      user={user}
      unreadNotifications={unread}
      recentNotifications={recentResult.ok ? recentResult.data : []}
      markAllNotificationsRead={markAllReadAction}
    >
      {children}
    </AdminShell>
  );
}