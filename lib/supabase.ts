import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(url && serviceKey);
}

/** Browser-safe client. Respects Row Level Security. */
export function publicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Server-only client. Bypasses RLS — never import into a client component. */
export function serviceClient(): SupabaseClient | null {
  if (!isServiceRoleConfigured()) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Browser client used only by the admin sign-in flow. */
export function browserAuthClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

export function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowlistedAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = adminAllowlist();
  if (allowlist.length === 0) return false;
  return allowlist.includes(email.toLowerCase());
}
