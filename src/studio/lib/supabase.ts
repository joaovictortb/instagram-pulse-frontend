import { createClient } from "@supabase/supabase-js";
import { envStudio } from "./env-studio";

const supabaseUrl = envStudio(
  "VITE_SUPABASE_URL_STUDIO",
  "VITE_SUPABASE_URL",
);
const supabaseAnonKey = envStudio(
  "VITE_SUPABASE_ANON_KEY_STUDIO",
  "VITE_SUPABASE_ANON_KEY",
);

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[studio] Supabase: use VITE_SUPABASE_URL_STUDIO + VITE_SUPABASE_ANON_KEY_STUDIO (ou VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY).",
    );
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export { getSupabaseClient };
