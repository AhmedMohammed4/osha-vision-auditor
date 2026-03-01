import { createClient } from "@supabase/supabase-js";

function normalizeEnvValue(value: string | undefined): string {
  if (!value) return "";
  return value.trim().replace(/^['\"]|['\"]$/g, "");
}

const supabaseUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment."
  );
}

if (!supabaseUrl.startsWith("https://") || supabaseUrl.includes("your-project-id")) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is invalid. Use your real Supabase project URL (https://<project-id>.supabase.co)."
  );
}

if (supabaseAnonKey.includes("your-anon-key")) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY is invalid. Use the anon public key from your Supabase project settings."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
