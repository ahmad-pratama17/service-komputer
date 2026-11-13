import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mode";
import { demoActiveServices } from "@/lib/demo/queries";
import type { ServiceCategory } from "@/types";

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  starting_price: number;
  estimated_duration: number;
};

export async function getActiveServices(): Promise<PublicService[]> {
  if (isDemoMode()) {
    return demoActiveServices();
  }

  if (!hasSupabaseEnv) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .select(
      "id, name, description, category, starting_price, estimated_duration",
    )
    .eq("is_active", true)
    .order("name");

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    starting_price: row.starting_price,
    estimated_duration: row.estimated_duration,
  }));
}