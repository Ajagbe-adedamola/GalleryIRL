import { NextResponse } from "next/server";
import { isAllowlistedAdmin, publicClient, serviceClient } from "./supabase";

export interface AdminSession {
  email: string;
  userId: string;
}

type AuthResult = { session: AdminSession } | { error: NextResponse };

export async function requireAdmin(request: Request): Promise<AuthResult> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }

  const supabase = publicClient();
  if (!supabase) {
    return { error: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }) };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    return { error: NextResponse.json({ error: "Invalid session." }, { status: 401 }) };
  }

  if (!isAllowlistedAdmin(data.user.email)) {
    return { error: NextResponse.json({ error: "This account is not an admin." }, { status: 403 }) };
  }

  return { session: { email: data.user.email, userId: data.user.id } };
}

export function requireServiceRole() {
  const service = serviceClient();
  if (!service) {
    return {
      error: NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY is missing on the server." },
        { status: 503 },
      ),
    };
  }
  return { service };
}
