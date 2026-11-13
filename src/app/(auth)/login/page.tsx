import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser, homePathFor } from "@/lib/auth/session";
import { DEMO_ACCOUNTS, isDemoMode } from "@/lib/demo/mode";

export const metadata: Metadata = {
  title: "Masuk",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(homePathFor(user.role));
  }

  const demo = isDemoMode();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Masuk</CardTitle>
        <CardDescription>
          Masuk untuk mengelola pesanan layanan Anda.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {demo ? (
          <div
            className="space-y-1 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
            role="status"
          >
            <p className="font-semibold">Mode demo lokal — pakai salah satu akun ini:</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.email}>
                  {account.email} / {account.password} ({account.role})
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <LoginForm />
      </CardContent>
    </Card>
  );
}