import { createClient } from "@supabase/supabase-js";
import { mapOsmTagsToCategory, osmAddress, osmName, osmSubcategory, type OsmTags } from "../lib/osm";
import { slugify } from "../lib/utils";
import { loadEnv } from "./env";

/** Lagos bounding box: south, west, north, east */
const BBOX = "6.36,3.15,6.72,3.66";
const OVERPASS = "https://overpass-api.de/api/interpreter";

const QUERY = `
[out:json][timeout:180];
(
  nwr["tourism"="gallery"](${BBOX});
  nwr["tourism"="artwork"]["artwork_type"~"mural|street_art|graffiti"](${BBOX});
  nwr["amenity"="arts_centre"](${BBOX});
  nwr["amenity"="music_venue"](${BBOX});
  nwr["amenity"="nightclub"](${BBOX});
  nwr["shop"="boutique"](${BBOX});
  nwr["shop"="clothes"](${BBOX});
  nwr["craft"](${BBOX});
  nwr["amenity"="studio"](${BBOX});
);
out center tags;
`.trim();

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
}

interface PlaceRow {
  slug: string;
  name: string;
  category: string;
  subcategory: string | null;
  lat: number;
  lng: number;
  neighbourhood: string;
  description: string | null;
  instagram: string | null;
  website: string | null;
  images: string[];
  status: "pending";
  verified: false;
  approximate: false;
  source: "osm";
  opening_hours: string | null;
  osm_id: string;
}

function coordsOf(element: OverpassElement): { lat: number; lng: number } | null {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  return { lat, lng: lon };
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    process.exit(1);
  }

  console.log("Querying Overpass for creative places in Lagos…");
  const response = await fetch(OVERPASS, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "lagos-street-culture-map/0.1 (import script)",
    },
    body: new URLSearchParams({ data: QUERY }),
  });

  if (!response.ok) {
    console.error(`Overpass returned ${response.status}: ${await response.text()}`);
    process.exit(1);
  }

  const payload = (await response.json()) as { elements?: OverpassElement[] };
  const elements = payload.elements ?? [];
  console.log(`Overpass returned ${elements.length} elements.`);

  const seen = new Set<string>();
  const rows: PlaceRow[] = [];
  const perCategory: Record<string, number> = {};
  let skippedNoCategory = 0;
  let skippedUnnamed = 0;
  let skippedNoCoords = 0;
  let duplicates = 0;

  for (const element of elements) {
    const tags = element.tags ?? {};
    const category = mapOsmTagsToCategory(tags);
    if (!category) {
      skippedNoCategory += 1;
      continue;
    }

    const name = osmName(tags);
    if (!name || (!tags.name && !tags["name:en"] && category !== "street-art")) {
      skippedUnnamed += 1;
      continue;
    }

    const coords = coordsOf(element);
    if (!coords) {
      skippedNoCoords += 1;
      continue;
    }

    const osmId = `${element.type}/${element.id}`;
    const dedupeKey = `${name.toLowerCase()}|${coords.lat.toFixed(4)}|${coords.lng.toFixed(4)}`;
    if (seen.has(osmId) || seen.has(dedupeKey)) {
      duplicates += 1;
      continue;
    }
    seen.add(osmId);
    seen.add(dedupeKey);

    const slugBase = slugify(name) || "osm-place";
    const slug = `${slugBase}-${element.type[0]}${element.id}`.slice(0, 80);

    rows.push({
      slug,
      name,
      category,
      subcategory: osmSubcategory(tags),
      lat: Number(coords.lat.toFixed(6)),
      lng: Number(coords.lng.toFixed(6)),
      neighbourhood: tags["addr:suburb"] ?? tags["addr:city"] ?? "Lagos",
      description: osmAddress(tags),
      instagram: tags["contact:instagram"] ?? tags.instagram ?? null,
      website: tags.website ?? tags["contact:website"] ?? null,
      images: [],
      status: "pending",
      verified: false,
      approximate: false,
      source: "osm",
      opening_hours: tags.opening_hours ?? null,
      osm_id: osmId,
    });
    perCategory[category] = (perCategory[category] ?? 0) + 1;
  }

  console.log(
    `Mapped ${rows.length} places (${duplicates} duplicates, ${skippedNoCategory} unmatched tags, ` +
      `${skippedUnnamed} unnamed, ${skippedNoCoords} without coordinates).`,
  );
  console.log("By category:", perCategory);

  if (rows.length === 0) return;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  let inserted = 0;

  for (let index = 0; index < rows.length; index += 100) {
    const batch = rows.slice(index, index + 100);
    const { data, error } = await supabase
      .from("places")
      .upsert(batch, { onConflict: "osm_id", ignoreDuplicates: true })
      .select("id");

    if (error) {
      console.error("Batch insert failed:", error.message);
      process.exit(1);
    }
    inserted += data?.length ?? 0;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log(`Inserted ${inserted} pending OSM places (existing osm_id rows were skipped).`);
  console.log("Attribution: © OpenStreetMap contributors. Review them in /admin before publishing.");
}

void main();
