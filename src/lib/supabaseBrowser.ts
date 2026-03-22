import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

/** Cliente browser para Auth (e futuras queries com RLS). */
export const supabaseBrowser: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null;

export function isSupabaseAuthConfigured(): boolean {
  return !!supabaseBrowser;
}
