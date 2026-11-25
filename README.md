# Lagos Street Culture Map

An interactive, cinematic map of Lagos' creative ecosystem — independent fashion, art studios,
photography communities, music venues, creative spaces, galleries and street art.

Next.js (App Router) · TypeScript · Tailwind · MapLibre GL JS via react-map-gl · Leaflet fallback ·
Supabase (Postgres, Auth, Storage) · deployable on Vercel.

> **No invented venues.** The repository ships only ten listings whose names begin with
> `SAMPLE — replace me`. They exist so the interface can be tested. Real places arrive through
> moderated community submissions or the OpenStreetMap importer (`source = 'osm'`, always `pending`).

---

## Features

- **3D satellite map** with tilted camera (pitch 60, bearing -20, zoom 12 over Lagos), smooth 1.8 s
  fly-to, extruded building footprints from vector tiles (height from `render_height`/`height`,
  fallback 8 m), cool-toned vertical gradient, sky/atmosphere and distance haze.
- **Time of day** — Morning / Golden hour / Dusk / Night changes sun direction, sky, fog colour,
  satellite grading, building tint, UI accent and marker glow. Persisted.
- **Markers** — clustered GeoJSON, cluster circles tinted by dominant category, glowing canvas pins
  that stay upright when the map tilts, photo thumbnail pins for street art, approximate-location
  halos, and a "Creative density" heatmap toggle.
- **Place panel** — photo carousel, category chips, neighbourhood, description, Instagram, website,
  opening info, verified badge, Directions, Share (copies `/place/[slug]`), Report. Desktop side
  panel, mobile draggable bottom sheet.
- **Exploration** — search (name, neighbourhood, tag), multi-select category filters with live
  counts, ten neighbourhood fly-to presets, curated "Creative walk" routes with an animated line,
  numbered stops and camera follow, and a skippable cinematic intro.
- **Submissions** — honeypot, per-IP rate limit, client-side image compression, server-side image
  type/size validation, map location picker, and an "Approximate location" privacy option
  (coordinates rounded to ~300 m server-side; the exact point is never stored).
- **Moderation** — `/admin` with Supabase magic-link auth and an email allowlist. Approve, reject,
  edit, mark verified, delete.
- **Data Saver / weak devices** — automatically starts in a 2D Leaflet map with the same markers,
  filters, panels and route. The choice is persisted.
- **Accessibility** — keyboard-navigable filters, search and panels, alt text on imagery, visible
  focus rings, Escape closes panels, explicit "Reduced motion" switch (also honours
  `prefers-reduced-motion`).

---

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Without any keys the app runs on the sample dataset with Esri satellite
imagery (no key required) and an OpenStreetMap vector overlay for roads, labels and 3D buildings.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_MAPTILER_KEY` | recommended | MapTiler satellite basemap (default provider when present) |
| `NEXT_PUBLIC_SUPABASE_URL` | for live data | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for live data | Public anon key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Submissions, reports, admin API, seed/import scripts |
| `ADMIN_EMAILS` | for moderation | Comma-separated allowlist of admin emails |
| `NEXT_PUBLIC_BASEMAP_PROVIDER` | optional | `maptiler` \| `esri` \| `stadia` \| `protomaps` |
| `NEXT_PUBLIC_STADIA_KEY` | optional | Stadia Alidade Satellite |
| `NEXT_PUBLIC_PROTOMAPS_KEY` | optional | Protomaps dark vector basemap |

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. If the requested basemap provider has no
key, the app falls back to MapTiler (when keyed) or Esri and logs nothing sensitive.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migrations in order in the SQL editor (or with the Supabase CLI):
   - `supabase/migrations/0001_init.sql` — tables, indexes, `place-images` bucket (public read, 2 MB
     limit, JPEG/PNG/WebP only).
   - `supabase/migrations/0002_rls.sql` — Row Level Security and the `is_admin()` helper.
3. Add yourself as an admin (service role / SQL editor):

   ```sql
   insert into public.admins (email) values ('you@example.com')
   on conflict (email) do nothing;
   ```

   Then set `ADMIN_EMAILS=you@example.com` in `.env.local` **and** in Vercel.
4. Create the admin user under **Authentication → Users** (or let them sign in once via magic link).
5. Seed sample rows (optional, for UI work):

   ```bash
   npm run seed
   ```

6. Import real places from OpenStreetMap (all arrive as `pending`):

   ```bash
   npm run import:osm
   ```

   The importer queries the Overpass API for the Lagos bounding box using
   `tourism=gallery`, `tourism=artwork` (mural/street art/graffiti), `amenity=arts_centre`,
   `amenity=music_venue`, `amenity=nightclub`, `shop=boutique`, `shop=clothes`, `craft=*` and
   `amenity=studio`. It maps tags to categories, dedupes by OSM id/name+coordinates, upserts with
   `source = 'osm'` and keeps everything pending for review. Existing `osm_id` rows are skipped.
   Please respect the [Overpass usage policy](https://operations.osmfoundation.org/policies/api/)
   and the attribution “© OpenStreetMap contributors”.

### Schema notes

- `places` stores `status` (`pending`/`approved`/`rejected`), `verified`, `approximate`, `source`,
  `images text[]`, plus `opening_hours` and `osm_id` (unique, for idempotent imports).
- `routes` holds curated walks as ordered `stop_ids uuid[]`.
- `reports` records moderation reports against a place.
- RLS: anonymous users read **approved** places only and may insert only with `status = 'pending'`,
  `verified = false`. Updates and deletes are limited to `public.is_admin()`, which checks the
  `admins` allowlist against `auth.jwt() ->> 'email'`. The `admins` table itself has RLS enabled with
  no policies, so it is service-role only.
- Storage: `place-images` is public-read; writes go through the server (service role), and the
  bucket enforces 2 MB and JPEG/PNG/WebP.

### Seed data

`scripts/seed.ts` upserts the ten `SAMPLE — replace me` listings and one placeholder route from
`lib/sample-data.ts`, using fixed UUIDs so the sample route resolves. Remove them in `/admin` once
real places are approved. If Supabase returns no approved places, the UI falls back to the same
labelled samples so the map is never empty.

---

## Basemaps & attribution

Provider abstraction lives in `lib/map/basemaps.ts`; the style is assembled in `lib/map/style.ts`.

| Provider | Type | Key | Notes |
| --- | --- | --- | --- |
| `maptiler` | Satellite raster | `NEXT_PUBLIC_MAPTILER_KEY` | Default when keyed |
| `esri` | Satellite raster | none | Safe fallback, always available |
| `stadia` | Satellite raster | `NEXT_PUBLIC_STADIA_KEY` | Alidade Satellite |
| `protomaps` | Dark vector | `NEXT_PUBLIC_PROTOMAPS_KEY` | No satellite; earth/water/roads/buildings only |

Roads, labels and building footprints come from a vector overlay (OpenFreeMap, OpenMapTiles schema;
Protomaps schema when that provider is selected). Attribution for the active imagery and data is
rendered in a persistent overlay above panels. The 2D fallback uses OpenStreetMap raster tiles with
“© OpenStreetMap contributors”. For production traffic, review each provider's tile usage policy;
the public OSM tile server is not intended for heavy use.

---

## Moderation

`/admin` signs in with a Supabase magic link. API routes under `/api/admin/*` verify the bearer
token with Supabase Auth, then check `ADMIN_EMAILS`, then use the service role. Actions: approve,
reject, edit name/category/neighbourhood/description/opening hours, mark verified, delete.

Submissions and reports use `/api/submissions` and `/api/reports`. They validate with Zod, enforce a
honeypot and a best-effort in-memory per-IP rate limit (5 submissions / 10 min, 8 reports / hour).
Serverless instances each keep their own window — add Upstash/Redis or a database-backed limiter if
you need strict global limits.

---

## Privacy

- "Approximate location" rounds coordinates to ~0.0027° (≈300 m) on the server before insert and
  displays a halo instead of a precise pin, plus an explicit note in the panel.
- Public reads are limited to approved rows; pending/rejected submissions are never readable with
  the anon key.
- No IP addresses are stored; the limiter key is transient memory only.

---

## Deploying to Vercel

1. Push the repository and import it in Vercel (framework preset: Next.js).
2. Add the environment variables above (Production and Preview). Keep the service role key
   server-only.
3. Set the Supabase Auth Site URL to your deployment and add `/admin` to the redirect allowlist so
   magic links return correctly.
4. Deploy, then run `npm run seed` / `npm run import:osm` locally against the production project
   (or use the Supabase SQL editor for manual entries).
5. The map page uses `dynamic = "force-dynamic"` so newly approved places appear without a rebuild.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run seed` | Upsert labelled sample places and the placeholder route |
| `npm run import:osm` | Query Overpass and insert pending OSM places |

---

## Known limitations

- Sample photography in `public/sample/` is AI-generated and only used by the labelled sample rows.
- The heatmap is 3D-only; the 2D fallback keeps markers, filters, route and panels.
- Route geometry is a straight line between stops (intentionally simple placeholder walking route).
- The in-memory rate limiter is per serverless instance; see Moderation for hardening.
- Rate limiting, magic-link email delivery and storage uploads require a configured Supabase project.
