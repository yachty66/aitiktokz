import { createClient } from "@supabase/supabase-js";

export function createSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY env vars");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function createSupabaseBrowserClient() {
  const url =
    (process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined) ||
    (process.env.SUPABASE_URL as string | undefined);
  const key =
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
    (process.env.SUPABASE_ANON_KEY as string | undefined);
  if (!url || !key) {
    throw new Error(
      "Missing Supabase client env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_ANON_KEY)."
    );
  }
  return createClient(url, key);
}
