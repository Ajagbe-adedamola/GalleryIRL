import { NextResponse } from "next/server";
import { approximateLocation } from "@/lib/geo";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { serviceClient } from "@/lib/supabase";
import { normaliseInstagram, normaliseWebsite, slugify } from "@/lib/utils";
import {
  parseImageDataUrl,
  submissionLocationError,
  submissionSchema,
} from "@/lib/validation";

const BUCKET = "place-images";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = rateLimit(`submission:${ip}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many submissions from this connection. Try again shortly." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the form and try again." },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Honeypot: pretend success, store nothing.
  if (data.company && data.company.length > 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const locationError = submissionLocationError(data.lat, data.lng);
  if (locationError) {
    return NextResponse.json({ error: locationError }, { status: 400 });
  }

  const service = serviceClient();
  if (!service) {
    return NextResponse.json(
      { error: "Submissions are not configured: add Supabase keys and run the migrations." },
      { status: 503 },
    );
  }

  const images: string[] = [];
  for (const [index, dataUrl] of data.images.entries()) {
    const image = parseImageDataUrl(dataUrl);
    if (!image) {
      return NextResponse.json(
        { error: "Images must be JPEG, PNG or WebP and under 2 MB each." },
        { status: 400 },
      );
    }
    const path = `submissions/${crypto.randomUUID()}-${index}.${image.extension}`;
    const upload = await service.storage.from(BUCKET).upload(path, image.bytes, {
      contentType: image.mime,
      upsert: false,
    });
    if (upload.error) {
      console.error("[submissions] upload failed", upload.error.message);
      return NextResponse.json({ error: "Could not store the uploaded photo." }, { status: 500 });
    }
    images.push(service.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }

  const baseSlug = slugify(data.name) || "place";
  let slug = baseSlug;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const existing = await service.from("places").select("id").eq("slug", slug).maybeSingle();
    if (!existing.data) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // Approximate submissions are rounded server-side; the exact point is never stored.
  const coords = data.approximate
    ? approximateLocation(data.lat, data.lng)
    : { lat: data.lat, lng: data.lng };

  const insert = await service
    .from("places")
    .insert({
      slug,
      name: data.name,
      category: data.category,
      neighbourhood: data.neighbourhood,
      description: data.description?.trim() || null,
      instagram: normaliseInstagram(data.instagram),
      website: normaliseWebsite(data.website),
      lat: Number(coords.lat.toFixed(6)),
      lng: Number(coords.lng.toFixed(6)),
      images,
      status: "pending",
      verified: false,
      approximate: data.approximate ?? false,
      source: "community",
      submitted_by: null,
    })
    .select("id")
    .single();

  if (insert.error) {
    console.error("[submissions] insert failed", insert.error.message);
    return NextResponse.json({ error: "Could not save this submission." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: insert.data.id }, { status: 201 });
}
