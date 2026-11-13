import { redirect } from "next/navigation";

/**
 * Rute lama /assistant sudah dipindahkan ke /dashboard/ai.
 * Redirect dipilih agar bookmark lama tetap bekerja.
 */
export default function AssistantPage() {
  redirect("/dashboard/ai");
}
