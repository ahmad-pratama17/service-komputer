import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mode";
import { demoAssistantServices } from "@/lib/demo/queries";

/**
 * Katalog layanan aktif untuk konteks AI. Dibaca read-only lewat session
 * user; tidak ada akses tulis di jalur ini.
 */
export async function getAssistantServices(): Promise<
  {
    name: string;
    description: string | null;
    category: string;
    startingPrice: number;
    estimatedDuration: number;
  }[]
> {
  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (isDemoMode()) {
    return demoAssistantServices();
  }

  if (!hasSupabaseEnv) {
    return [];
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from("services")
    .select("name, description, category, starting_price, estimated_duration")
    .eq("is_active", true)
    .order("starting_price", { ascending: true })
    .limit(30);

  return (data ?? []).map((row) => ({
    name: row.name,
    description: row.description,
    category: row.category,
    startingPrice: row.starting_price,
    estimatedDuration: row.estimated_duration,
  }));
}
