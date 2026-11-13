import { requireStaff } from "@/lib/auth/session";

export default async function TeknisiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaff();

  return children;
}
