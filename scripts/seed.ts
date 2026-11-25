import { createClient } from "@supabase/supabase-js";
import { SAMPLE_PLACES, SAMPLE_ROUTE } from "../lib/sample-data";
import { loadEnv } from "./env";

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local first.",
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const rows = SAMPLE_PLACES.map((place) => {
    const { osm_id: _osmId, ...row } = place;
    return row;
  });

  const placesResult = await supabase.from("places").upsert(rows, { onConflict: "id" });
  if (placesResult.error) {
    console.error("Seeding places failed:", placesResult.error.message);
    process.exit(1);
  }

  const routeResult = await supabase
    .from("routes")
    .upsert([{ ...SAMPLE_ROUTE }], { onConflict: "id" });
  if (routeResult.error) {
    console.error("Seeding route failed:", routeResult.error.message);
    process.exit(1);
  }

  console.log(
    `Seeded ${rows.length} sample places and 1 sample route. All names begin with “SAMPLE — replace me”.`,
  );
  console.log("Delete them in the admin console once real, reviewed places are approved.");
}

void main();
