import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser, homePathFor } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Daftar",
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(homePathFor(user.role));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar</CardTitle>
        <CardDescription>
          Buat akun untuk memesan layanan service komputer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}