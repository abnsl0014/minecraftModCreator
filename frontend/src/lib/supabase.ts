import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

if (supabaseUrl.includes("placeholder")) {
  console.warn("Supabase env vars missing — auth will not work");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Keep session fresh — Supabase SDK auto-refreshes tokens on this listener
supabase.auth.onAuthStateChange((_event, _session) => {
  // SDK handles token refresh internally; listener keeps it active
});

export async function getAuthToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    // Session expired or invalid — attempt a refresh
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session) {
      return null;
    }
    return refreshed.session.access_token;
  }
  return data.session.access_token;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}
