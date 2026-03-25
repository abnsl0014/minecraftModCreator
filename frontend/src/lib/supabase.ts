import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

if (supabaseUrl.includes("placeholder")) {
  console.warn("Supabase env vars missing — auth will not work");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function isAuthenticated(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}
