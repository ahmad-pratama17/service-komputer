"use client";

import { useFormStatus } from "react-dom";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      <LogOut className="h-4 w-4" aria-hidden />
      {pending ? "Keluar..." : "Keluar"}
    </Button>
  );
}

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <SubmitButton />
    </form>
  );
}