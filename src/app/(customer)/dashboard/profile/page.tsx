import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "@/components/auth/profile-form";
import { requireCustomer } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Profil Saya",
};

export default async function ProfilePage() {
  const user = await requireCustomer();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Profil Saya
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Perbarui informasi akun Anda.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Akun</CardTitle>
          <CardDescription>Data utama akun Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-1">
            <p className="text-sm text-zinc-500">Email (tidak dapat diubah)</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {user.email}
            </p>
          </div>
          <ProfileForm fullName={user.name} phone={user.phone} />
        </CardContent>
      </Card>
    </div>
  );
}