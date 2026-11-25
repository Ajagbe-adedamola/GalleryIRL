import { cache } from "react";
import { SAMPLE_PLACES, SAMPLE_ROUTE } from "./sample-data";
import { publicClient, isSupabaseConfigured } from "./supabase";
import { isCategoryId } from "./categories";
import type { CreativeRoute, Place } from "./types";

export interface Dataset {
  places: Place[];
  routes: CreativeRoute[];
  /** True when the app is rendering the labelled sample dataset. */
  sample: boolean;
  /** Set when Supabase was configured but the query failed. */
  degraded: boolean;
}

function normalisePlace(row: Record<string, unknown>): Place | null {
  const category = String(row.category ?? "");
  if (!isCategoryId(category)) return null;
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    category,
    subcategory: (row.subcategory as string | null) ?? null,
    lat,
    lng,
    neighbourhood: String(row.neighbourhood ?? ""),
    description: (row.description as string | null) ?? null,
    instagram: (row.instagram as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    status: (row.status as Place["status"]) ?? "approved",
    verified: Boolean(row.verified),
    approximate: Boolean(row.approximate),
    source: (row.source as Place["source"]) ?? "community",
    opening_hours: (row.opening_hours as string | null) ?? null,
    submitted_by: (row.submitted_by as string | null) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    osm_id: (row.osm_id as string | null) ?? null,
  };
}

/** Deduplicated within a request (metadata + page). */
export const getDataset = cache(async (): Promise<Dataset> => {
  if (!isSupabaseConfigured()) {
    return { places: SAMPLE_PLACES, routes: [SAMPLE_ROUTE], sample: true, degraded: false };
  }

  const supabase = publicClient();
  if (!supabase) {
    return { places: SAMPLE_PLACES, routes: [SAMPLE_ROUTE], sample: true, degraded: false };
  }

  try {
    const [placesResult, routesResult] = await Promise.all([
      supabase.from("places").select("*").eq("status", "approved").order("created_at"),
      supabase.from("routes").select("*").order("created_at"),
    ]);

    if (placesResult.error) throw placesResult.error;

    const places = (placesResult.data ?? [])
      .map((row) => normalisePlace(row as Record<string, unknown>))
      .filter((place): place is Place => Boolean(place));

    const routes: CreativeRoute[] = (routesResult.data ?? []).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      description: (row.description as string | null) ?? null,
      stop_ids: Array.isArray(row.stop_ids) ? (row.stop_ids as string[]) : [],
    }));

    if (places.length === 0) {
      // A fresh database: show the labelled samples so the UI is explorable.
      return { places: SAMPLE_PLACES, routes: routes.length ? routes : [SAMPLE_ROUTE], sample: true, degraded: false };
    }

    return { places, routes, sample: false, degraded: false };
  } catch (error) {
    console.error("[data] Supabase query failed, falling back to sample data:", error);
    return { places: SAMPLE_PLACES, routes: [SAMPLE_ROUTE], sample: true, degraded: true };
  }
});
