"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerAction } from "@/app/actions/auth";
import type { AuthFormState } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthFormState = { status: "idle" };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) {
    return null;
  }
  return (
    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[0]}</p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Memproses..." : "Daftar"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "success" && state.message ? (
        <p
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
        >
          {state.message}
        </p>
      ) : null}

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {state.message}
        </p>
      ) : null}

      <div>
        <Label htmlFor="fullName">Nama Lengkap</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Nama Anda"
          aria-invalid={Boolean(state.fieldErrors?.fullName)}
        />
        <FieldError errors={state.fieldErrors?.fullName} />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        <FieldError errors={state.fieldErrors?.email} />
      </div>

      <div>
        <Label htmlFor="phone">No. HP (opsional)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="08xxxxxxxxxx"
          aria-invalid={Boolean(state.fieldErrors?.phone)}
        />
        <FieldError errors={state.fieldErrors?.phone} />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        <FieldError errors={state.fieldErrors?.password} />
        <p className="mt-1 text-xs text-zinc-500">
          Minimal 8 karakter, mengandung huruf dan angka.
        </p>
      </div>

      <div>
        <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
        />
        <FieldError errors={state.fieldErrors?.confirmPassword} />
      </div>

      <SubmitButton />

      <p className="text-center text-sm text-zinc-500">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:underline"
        >
          Masuk
        </Link>
      </p>
    </form>
  );
}