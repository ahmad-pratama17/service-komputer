"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfileAction } from "@/app/actions/auth";
import type { AuthFormState } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthFormState = { status: "idle" };

type ProfileFormProps = {
  fullName: string;
  phone: string | null;
};

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
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan..." : "Simpan Perubahan"}
    </Button>
  );
}

export function ProfileForm({ fullName, phone }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
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
          defaultValue={fullName}
          aria-invalid={Boolean(state.fieldErrors?.fullName)}
        />
        <FieldError errors={state.fieldErrors?.fullName} />
      </div>

      <div>
        <Label htmlFor="phone">No. HP (opsional)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="08xxxxxxxxxx"
          defaultValue={phone ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.phone)}
        />
        <FieldError errors={state.fieldErrors?.phone} />
      </div>

      <SubmitButton />
    </form>
  );
}