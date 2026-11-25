"use client";

import { CategoryIcon } from "./ui/CategoryIcon";
import { CATEGORIES } from "@/lib/categories";
import { NEIGHBOURHOODS } from "@/lib/neighbourhoods";
import type { CategoryId, CreativeRoute } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ExplorerPanelProps {
  counts: Record<CategoryId, number>;
  neighbourhoodCounts: Record<string, number>;
  activeCategories: CategoryId[];
  onToggleCategory: (id: CategoryId) => void;
  onClearFilters: () => void;
  activeNeighbourhood: string | null;
  onSelectNeighbourhood: (name: string | null) => void;
  heat: boolean;
  onToggleHeat: () => void;
  mode: "3d" | "2d";
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  routes: CreativeRoute[];
  activeRouteId: string | null;
  routePlaying: boolean;
  onPlayRoute: (route: CreativeRoute) => void;
  onStopRoute: () => void;
  visibleCount: number;
  totalCount: number;
  sample: boolean;
  degraded: boolean;
  open: boolean;
  onClose: () => void;
  variant: "desktop" | "mobile";
}

const THUMB_GRADIENTS = [
  "linear-gradient(140deg, rgba(255,126,182,0.35), rgba(8,10,14,0.9))",
  "linear-gradient(140deg, rgba(95,224,206,0.32), rgba(8,10,14,0.9))",
  "linear-gradient(140deg, rgba(255,178,104,0.32), rgba(8,10,14,0.9))",
];

function ExplorerContent(props: ExplorerPanelProps) {
  const {
    counts,
    neighbourhoodCounts,
    activeCategories,
    onToggleCategory,
    onClearFilters,
    activeNeighbourhood,
    onSelectNeighbourhood,
    heat,
    onToggleHeat,
    mode,
    reducedMotion,
    onToggleReducedMotion,
    routes,
    activeRouteId,
    routePlaying,
    onPlayRoute,
    onStopRoute,
    visibleCount,
    totalCount,
    sample,
    degraded,
    onClose,
  } = props;

  const filtered = activeCategories.length > 0 || Boolean(activeNeighbourhood);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-4 pb-3 pt-4">
        <div>
          <p className="mono-label">Explore</p>
          <p className="mt-1 text-[15px] font-light text-white">
            {visibleCount}
            <span className="text-white/35"> / {totalCount} places</span>
          </p>
        </div>
        <button type="button" onClick={onClose} className="btn h-8 w-8 rounded-full p-0" aria-label="Close explorer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="panel-scroll flex-1 overflow-y-auto">
        {sample ? (
          <div className="mx-4 mt-3 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-2.5">
            <p className="mono-label text-[var(--accent)]">Sample dataset</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/65">
              Every listing is labelled “SAMPLE — replace me”. Run the seed and OSM import scripts to
              replace them with reviewed, real places.
            </p>
          </div>
        ) : null}
        {degraded ? (
          <p className="mx-4 mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200/90">
            Supabase could not be reached — showing the sample dataset instead.
          </p>
        ) : null}

        <section className="border-b border-white/[0.06] px-4 py-4" aria-labelledby="filter-categories">
          <div className="flex items-center justify-between">
            <h2 id="filter-categories" className="mono-label">
              Categories
            </h2>
            {filtered ? (
              <button
                type="button"
                onClick={onClearFilters}
                className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--accent)] hover:underline"
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CATEGORIES.map((category) => {
              const active = activeCategories.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onToggleCategory(category.id)}
                  aria-pressed={active}
                  className="chip"
                  data-active={active}
                >
                  <span style={{ color: category.color }}>
                    <CategoryIcon category={category.id} size={13} />
                  </span>
                  <span>{category.shortLabel}</span>
                  <span className="font-mono text-[9px] text-white/40">{counts[category.id] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="border-b border-white/[0.06] px-4 py-4" aria-labelledby="filter-neighbourhoods">
          <div className="flex items-center justify-between">
            <h2 id="filter-neighbourhoods" className="mono-label">
              Neighbourhoods
            </h2>
            <button
              type="button"
              onClick={() => onSelectNeighbourhood(null)}
              aria-pressed={!activeNeighbourhood}
              className={cn(
                "font-mono text-[9px] uppercase tracking-[0.16em]",
                !activeNeighbourhood ? "text-[var(--accent)]" : "text-white/40 hover:text-white/70",
              )}
            >
              All Lagos
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {NEIGHBOURHOODS.map((neighbourhood) => {
              const active = activeNeighbourhood === neighbourhood.name;
              const count = neighbourhoodCounts[neighbourhood.name] ?? 0;
              return (
                <button
                  key={neighbourhood.id}
                  type="button"
                  onClick={() => onSelectNeighbourhood(active ? null : neighbourhood.name)}
                  aria-pressed={active}
                  className={cn(
                    "group flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                    active
                      ? "border-[var(--accent)]/60 bg-[var(--accent-soft)]"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]",
                  )}
                >
                  <span className="truncate text-[11.5px] text-white/85">{neighbourhood.name}</span>
                  <span className="font-mono text-[9px] text-white/35">{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="border-b border-white/[0.06] px-4 py-4" aria-labelledby="layers-heading">
          <h2 id="layers-heading" className="mono-label">
            Layers & motion
          </h2>

          <label className={cn("mt-3 flex cursor-pointer items-start justify-between gap-3", mode === "2d" && "opacity-50")}>
            <span>
              <span className="block text-[12px] text-white/85">Creative density</span>
              <span className="mt-0.5 block text-[10.5px] leading-relaxed text-white/40">
                {mode === "2d" ? "Heat layer needs the 3D map." : "Heatmap of every creative point."}
              </span>
            </span>
            <input
              type="checkbox"
              className="peer sr-only"
              checked={heat}
              disabled={mode === "2d"}
              onChange={onToggleHeat}
              aria-label="Toggle creative density heat layer"
            />
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors",
                heat ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-white/15 bg-white/5",
                "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]",
              )}
            >
              <span
                className={cn(
                  "h-3.5 w-3.5 rounded-full transition-transform",
                  heat ? "translate-x-4 bg-[var(--accent)]" : "translate-x-0 bg-white/50",
                )}
              />
            </span>
          </label>

          <label className="mt-4 flex cursor-pointer items-start justify-between gap-3">
            <span>
              <span className="block text-[12px] text-white/85">Reduced motion</span>
              <span className="mt-0.5 block text-[10.5px] leading-relaxed text-white/40">
                Disables fly-to animation and atmosphere drift.
              </span>
            </span>
            <input
              type="checkbox"
              className="peer sr-only"
              checked={reducedMotion}
              onChange={onToggleReducedMotion}
              aria-label="Toggle reduced motion"
            />
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors",
                reducedMotion ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-white/15 bg-white/5",
                "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]",
              )}
            >
              <span
                className={cn(
                  "h-3.5 w-3.5 rounded-full transition-transform",
                  reducedMotion ? "translate-x-4 bg-[var(--accent)]" : "translate-x-0 bg-white/50",
                )}
              />
            </span>
          </label>
        </section>

        <section className="px-4 py-4" aria-labelledby="routes-heading">
          <h2 id="routes-heading" className="mono-label">
            Curated routes
          </h2>
          <div className="mt-3 space-y-2">
            {routes.length === 0 ? (
              <p className="text-[11.5px] leading-relaxed text-white/40">
                No routes published yet. Curators can add one in Supabase.
              </p>
            ) : null}
            {routes.map((route, index) => {
              const isActive = activeRouteId === route.id;
              return (
                <div
                  key={route.id}
                  className={cn(
                    "overflow-hidden rounded-xl border transition-colors",
                    isActive
                      ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]"
                      : "border-white/[0.08] bg-white/[0.02]",
                  )}
                >
                  <div
                    className="h-16 w-full"
                    style={{ background: THUMB_GRADIENTS[index % THUMB_GRADIENTS.length] }}
                    aria-hidden="true"
                  />
                  <div className="p-3">
                    <p className="text-[12.5px] font-normal leading-snug text-white">{route.title}</p>
                    <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-white/45">
                      {route.description ?? "A curated walk across the city."}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">
                        {route.stop_ids.length} stops
                      </span>
                      {isActive ? (
                        <button type="button" onClick={onStopRoute} className="btn px-2.5 py-1 text-[10px]">
                          {routePlaying ? "Pause" : "Stop"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onPlayRoute(route)}
                          className="btn btn-accent px-2.5 py-1 text-[10px]"
                        >
                          Play walk
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="border-t border-white/[0.06] px-4 py-4">
          <p className="mono-label">Privacy</p>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-white/40">
            Home-based creatives can publish an approximate location (rounded to ~300 m). Exact addresses
            are never shown for those listings.
          </p>
          <p className="mt-3 text-[10.5px] leading-relaxed text-white/30">
            Imported places come from OpenStreetMap contributors and are reviewed before publication.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ExplorerPanel(props: ExplorerPanelProps) {
  const { open, onClose, variant, activeCategories, activeNeighbourhood } = props;
  const activeFilterCount = activeCategories.length + (activeNeighbourhood ? 1 : 0);

  if (variant === "desktop") {
    return (
      <aside
        className="pointer-events-none absolute bottom-4 left-0 top-[86px] z-20 hidden w-[324px] px-4 lg:block"
        aria-label="Explore and filter places"
      >
        <div className="pointer-events-auto glass h-full overflow-hidden rounded-2xl">
          <ExplorerContent {...props} />
        </div>
      </aside>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close filters"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "absolute bottom-0 left-0 top-[104px] w-[90%] max-w-[360px] p-2 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal={open}
        aria-label="Filters and layers"
      >
        <div className="glass h-full overflow-hidden rounded-2xl">
          <div className="px-4 pt-3">
            <span className="mono-label">
              {activeFilterCount > 0 ? `${activeFilterCount} active filters` : "Browse the city"}
            </span>
          </div>
          <div className="h-[calc(100%-40px)]">
            <ExplorerContent {...props} />
          </div>
        </div>
      </div>
    </div>
  );
}

