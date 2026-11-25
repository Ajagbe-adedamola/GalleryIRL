import { NextResponse } from "next/server";
import { requireAdmin, requireServiceRole } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const service = requireServiceRole();
  if ("error" in service) return service.error;

  const { data, error } = await service.service
    .from("places")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin] list failed", error.message);
    return NextResponse.json({ error: "Could not load places." }, { status: 500 });
  }

  return NextResponse.json({ places: data ?? [], admin: auth.session.email });
}
