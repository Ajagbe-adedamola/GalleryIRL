# AGENTS.md

## Rules

- **Only Bun.** Use `bun` for install, dev, build, seed, and imports. Never use `npm`/`npx`.
- **Build/typecheck.** Run `bunx next build && bunx tsc --noEmit`. Do not commit build/tsc output.
- **Seed data.** Real OSM data comes from `npm run import:osm`; `lib/sample-data.ts` is only a development placeholder and must not ship as database content.
- **Supabase env.** Copy `.env.example` to `.env.local` and set these keys before any Supabase work; never commit `.env*`. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are the two required **public** keys. `SUPABASE_SERVICE_ROLE_KEY` is **server-side only**.
- **No sample data left in code.** Remove every `SAMPLE — replace me` row from the repository (sample data, `public/sample/*.jpg`, and `lib/sample-data.ts`) before any deploy or public release.
- **Deploy only after both keys are set.** Do not deploy while `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are empty.
