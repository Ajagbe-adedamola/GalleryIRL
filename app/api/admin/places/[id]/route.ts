import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, requireServiceRole } from "@/lib/admin-auth";
import { approximateLocation } from "@/lib/geo";
import { CATEGORY_IDS } from "@/lib/types";

const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(90).optional(),
    category: z.enum(CATEGORY_IDS).optional(),
    neighbourhood: z.string().trim().min(2).max(60).optional(),
    description: z.string().trim().max(900).nullable().optional(),
    instagram: z.string().trim().max(200).nullable().optional(),
    website: z.string().trim().max(200).nullable().optional(),
    opening_hours: z.string().trim().max(200).nullable().optional(),
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    verified: z.boolean().optional(),
    approximate: z.boolean().optional(),
  })
  .strict();

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const service = requireServiceRole();
  if ("error" in service) return service.error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid update." },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.approximate !== undefined) {
    const current = await service.service.from("places").select("lat, lng").eq("id", id).single();
    if (current.error || !current.data) {
      return NextResponse.json({ error: "Place not found." }, { status: 404 });
    }
    if (parsed.data.approximate) {
      const rounded = approximateLocation(Number(current.data.lat), Number(current.data.lng));
      updates.lat = Number(rounded.lat.toFixed(6));
      updates.lng = Number(rounded.lng.toFixed(6));
    }
  }

  const { data, error } = await service.service
    .from("places")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[admin] update failed", error.message);
    return NextResponse.json({ error: "Could not update this place." }, { status: 500 });
  }

  return NextResponse.json({ place: data });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const service = requireServiceRole();
  if ("error" in service) return service.error;

  const { id } = await params;
  const { error } = await service.service.from("places").delete().eq("id", id);
  if (error) {
    console.error("[admin] delete failed", error.message);
    return NextResponse.json({ error: "Could not delete this place." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
