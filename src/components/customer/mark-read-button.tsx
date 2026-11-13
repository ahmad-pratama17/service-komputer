"use client";

import { useFormStatus } from "react-dom";
import { markNotificationReadAction } from "@/app/actions/order";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
    >
      {pending ? "..." : "Tandai dibaca"}
    </button>
  );
}

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  return (
    <form action={markNotificationReadAction.bind(null, notificationId)}>
      <SubmitButton />
    </form>
  );
}