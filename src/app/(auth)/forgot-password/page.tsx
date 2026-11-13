import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Lupa Password",
};

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lupa Password</CardTitle>
        <CardDescription>
          Fitur reset password akan dibangun pada fase berikutnya.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-500">
          Masukkan email Anda untuk menerima tautan reset password.
        </p>
      </CardContent>
      <CardFooter>
        <Link href="/login" className="text-sm text-zinc-500 hover:underline">
          Kembali ke halaman masuk
        </Link>
      </CardFooter>
    </Card>
  );
}