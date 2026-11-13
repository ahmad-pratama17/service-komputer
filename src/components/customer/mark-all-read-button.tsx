"use client";

import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { markAllReadAction } from "@/app/actions/notifications";
import { buttonClassName } from "@/components/ui/button";

export function MarkAllReadButton({ unreadCount }: { unreadCount: number }) {
  const [pending, startTransition] = useTransition();

  if (unreadCount === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => startTransition(async () => markAllReadAction())}
      disabled={pending}
      className={buttonClassName("outline", "sm")}
    >
      <CheckCheck className="h-4 w-4" aria-hidden />
      {pending ? "Menyimpan..." : "Tandai semua dibaca"}
    </button>
  );
}