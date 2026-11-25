import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { serviceClient } from "@/lib/supabase";
import { reportSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = rateLimit(`report:${ip}`, 8, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many reports. Try again later." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid report." },
      { status: 400 },
    );
  }

  if (parsed.data.company) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const service = serviceClient();
  if (!service) {
    return NextResponse.json({ error: "Reports are not configured on this deployment." }, { status: 503 });
  }

  const { error } = await service.from("reports").insert({
    place_id: parsed.data.placeId,
    reason: parsed.data.reason,
  });

  if (error) {
    console.error("[reports] insert failed", error.message);
    return NextResponse.json({ error: "Could not save this report." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
