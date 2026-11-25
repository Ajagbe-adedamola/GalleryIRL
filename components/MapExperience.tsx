"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { LAGOS_CENTER, NEIGHBOURHOODS } from "@/lib/neighbourhoods";
import { resolveBasemap } from "@/lib/map/basemaps";
import type { MapHandle } from "@/lib/map/handle";
import { resolveTimeOfDay, type TimeOfDayId } from "@/lib/time-of-day";
import type { CategoryId, CreativeRoute, Place } from "@/lib/types";
import { AddPlaceDialog } from "./AddPlaceDialog";
import { ExplorerPanel } from "./ExplorerPanel";
import { Header } from "./Header";
import { IntroOverlay } from "./IntroOverlay";
import { PlacePanel } from "./PlacePanel";

const Map3D = dynamic(() => import("./map/Map3D").then((module) => module.Map3D), {
  ssr: false,
  loading: () => <MapSkeleton label="Warming up the satellite…" />,
});

const Map2D = dynamic(() => import("./map/Map2D").then((module) => module.Map2D), {
  ssr: false,
  loading: () => <MapSkeleton label="Loading the 2D map…" />,
});

function MapSkeleton({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#05070a]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full border border-[var(--accent)]/40" />
        <p className="mono-label mt-4">{label}</p>
      </div>
    </div>
  );
}

interface MapExperienceProps {
  places: Place[];
  routes: CreativeRoute[];
  sample: boolean;
  degraded?: boolean;
  initialSlug?: string;
}

type Mode = "3d" | "2d";

const STORAGE = {
  mode: "lagosmap.mode",
  tod: "lagosmap.tod",
  motion: "lagosmap.reducedMotion",
};

const CATEGORY_ORDER = CATEGORIES.map((category) => category.id);

export function MapExperience({ places, routes, sample, degraded, initialSlug }: MapExperienceProps) {
  const { basemap, attribution } = useMemo(() => resolveBasemap(), []);

  const [prefsReady, setPrefsReady] = useState(false);
  const [mode, setMode] = useState<Mode>("3d");
  const [todId, setTodId] = useState<TimeOfDayId>("dusk");
  const [reducedMotion, setReducedMotion] = useState(false);

  const [query, setQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState<CategoryId[]>([]);
  const [activeNeighbourhood, setActiveNeighbourhood] = useState<string | null>(null);
  const [heat, setHeat] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    initialSlug ? (places.find((place) => place.slug === initialSlug)?.id ?? null) : null,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [introVisible, setIntroVisible] = useState(!initialSlug);
  const [introCamera, setIntroCamera] = useState(!initialSlug);

  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [routePlaying, setRoutePlaying] = useState(false);
  const [routeProgress, setRouteProgress] = useState(0);

  const mapApi = useRef<MapHandle | null>(null);
  const introPlayed = useRef(false);
  const selectedRef = useRef<Place | null>(null);
  const tod = resolveTimeOfDay(todId);
  const showIntro = introVisible && !initialSlug && !reducedMotion;

  useEffect(() => {
    try {
      const storedMode = window.localStorage.getItem(STORAGE.mode);
      const storedTod = window.localStorage.getItem(STORAGE.tod);
      const storedMotion = window.localStorage.getItem(STORAGE.motion);
      const connection = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
      const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
      const weakDevice =
        Boolean(connection?.saveData) ||
        (navigator.hardwareConcurrency ?? 8) <= 2 ||
        (deviceMemory !== undefined && deviceMemory <= 2);

      if (storedMode === "2d" || storedMode === "3d") setMode(storedMode);
      else if (weakDevice) setMode("2d");

      if (storedTod) setTodId(resolveTimeOfDay(storedTod).id);
      if (storedMotion === "1") setReducedMotion(true);
      else if (!storedMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setReducedMotion(true);
      }
    } catch {
      /* private mode */
    }
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    try {
      window.localStorage.setItem(STORAGE.mode, mode);
      window.localStorage.setItem(STORAGE.tod, todId);
      window.localStorage.setItem(STORAGE.motion, reducedMotion ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [prefsReady, mode, todId, reducedMotion]);

  useEffect(() => {
    document.documentElement.dataset.tod = tod.id;
  }, [tod.id]);

  useEffect(() => {
    if (!showIntro) return;
    const timer = window.setTimeout(() => setIntroVisible(false), 6500);
    return () => window.clearTimeout(timer);
  }, [showIntro]);

  const placesById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);

  const searchMatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return places
      .filter((place) => {
        const haystack = [
          place.name,
          place.neighbourhood,
          place.subcategory ?? "",
          place.description ?? "",
          place.category.replace("-", " "),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      })
      .slice(0, 8);
  }, [places, query]);

  const baseForCounts = useMemo(() => {
    return places.filter((place) => {
      if (activeNeighbourhood && place.neighbourhood !== activeNeighbourhood) return false;
      const term = query.trim().toLowerCase();
      if (!term) return true;
      return [place.name, place.neighbourhood, place.subcategory ?? "", place.category.replace("-", " ")]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [places, activeNeighbourhood, query]);

  const counts = useMemo(() => {
    const result = Object.fromEntries(CATEGORY_ORDER.map((id) => [id, 0])) as Record<CategoryId, number>;
    for (const place of baseForCounts) result[place.category] += 1;
    return result;
  }, [baseForCounts]);

  const neighbourhoodCounts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const place of places) {
      if (activeCategories.length && !activeCategories.includes(place.category)) continue;
      result[place.neighbourhood] = (result[place.neighbourhood] ?? 0) + 1;
    }
    return result;
  }, [places, activeCategories]);

  const filteredPlaces = useMemo(() => {
    const term = query.trim().toLowerCase();
    return places.filter((place) => {
      if (activeCategories.length && !activeCategories.includes(place.category)) return false;
      if (activeNeighbourhood && place.neighbourhood !== activeNeighbourhood) return false;
      if (!term) return true;
      return [place.name, place.neighbourhood, place.subcategory ?? "", place.description ?? "", place.category.replace("-", " ")]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [places, activeCategories, activeNeighbourhood, query]);

  const selectedPlace = selectedId ? placesById.get(selectedId) ?? null : null;
  selectedRef.current = selectedPlace;

  const activeRoute = useMemo(
    () => routes.find((route) => route.id === activeRouteId) ?? null,
    [routes, activeRouteId],
  );

  const routeStops = useMemo(() => {
    if (!activeRoute) return [];
    return activeRoute.stop_ids
      .map((id) => placesById.get(id))
      .filter((place): place is Place => Boolean(place));
  }, [activeRoute, placesById]);

  const selectPlace = useCallback((place: Place) => {
    setSelectedId(place.id);
    setFiltersOpen(false);
    mapApi.current?.flyToPlace(place);
  }, []);

  const dismissPlace = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleReady = useCallback(() => {
    setIntroCamera(false);
    if (introPlayed.current) {
      if (selectedRef.current) {
        window.setTimeout(() => {
          if (selectedRef.current) mapApi.current?.flyToPlace(selectedRef.current);
        }, 300);
      }
      return;
    }
    introPlayed.current = true;

    if (initialSlug && selectedRef.current) {
      const place = selectedRef.current;
      window.setTimeout(() => mapApi.current?.flyToPlace(place), 450);
      setIntroVisible(false);
      return;
    }

    if (reducedMotion) return;

    window.setTimeout(() => {
      mapApi.current?.flyToCoords(LAGOS_CENTER[0], LAGOS_CENTER[1], {
        zoom: 12.4,
        pitch: 60,
        bearing: -20,
        duration: 6200,
      });
    }, 500);
  }, [initialSlug, reducedMotion]);

  const skipIntro = () => {
    setIntroVisible(false);
    setIntroCamera(false);
    mapApi.current?.flyToCoords(LAGOS_CENTER[0], LAGOS_CENTER[1], {
      zoom: 12.4,
      pitch: 60,
      bearing: -20,
      duration: reducedMotion ? 0 : 1100,
    });
  };

  const toggleCategory = (id: CategoryId) => {
    setActiveCategories((current) =>
      current.includes(id) ? current.filter((category) => category !== id) : [...current, id],
    );
  };

  const chooseNeighbourhood = (name: string | null) => {
    setActiveNeighbourhood(name);
    setFiltersOpen(false);
    if (!name) return;
    const preset = NEIGHBOURHOODS.find((neighbourhood) => neighbourhood.name === name);
    if (preset) mapApi.current?.flyToNeighbourhood(preset);
  };

  const toggleFilters = () => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setExplorerCollapsed((value) => !value);
    } else {
      setFiltersOpen((value) => !value);
    }
  };

  const playRoute = (route: CreativeRoute) => {
    const stops = route.stop_ids
      .map((id) => placesById.get(id))
      .filter((place): place is Place => Boolean(place));
    if (stops.length < 2) return;
    setSelectedId(null);
    setActiveRouteId(route.id);
    setRouteProgress(0);
    setRoutePlaying(true);
    setFiltersOpen(false);
    mapApi.current?.fitRoute(stops);
  };

  const stopRoute = () => {
    setRoutePlaying(false);
    setRouteProgress(0);
    setActiveRouteId(null);
  };

  useEffect(() => {
    if (!routePlaying || routeStops.length < 2) return;
    const duration = 16000;
    const started = performance.now();
    let lastIndex = -1;
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - started) / duration);
      setRouteProgress(progress);
      const index = Math.min(routeStops.length - 1, Math.floor(progress * routeStops.length));
      if (index !== lastIndex) {
        lastIndex = index;
        const stop = routeStops[index];
        mapApi.current?.flyToCoords(stop.lng, stop.lat, {
          zoom: 15,
          pitch: 52,
          duration: reducedMotion ? 0 : 2600,
        });
      }
      if (progress >= 1) {
        window.clearInterval(timer);
        setRoutePlaying(false);
      }
    }, 60);
    return () => window.clearInterval(timer);
  }, [routePlaying, routeStops, reducedMotion]);

  const attributionText =
    mode === "3d" ? attribution.join(" · ") : "© OpenStreetMap contributors";

  const explorerProps = {
    counts,
    neighbourhoodCounts,
    activeCategories,
    onToggleCategory: toggleCategory,
    onClearFilters: () => {
      setActiveCategories([]);
      setActiveNeighbourhood(null);
    },
    activeNeighbourhood,
    onSelectNeighbourhood: chooseNeighbourhood,
    heat,
    onToggleHeat: () => setHeat((value) => !value),
    mode,
    reducedMotion,
    onToggleReducedMotion: () => setReducedMotion((value) => !value),
    routes,
    activeRouteId,
    routePlaying,
    onPlayRoute: playRoute,
    onStopRoute: stopRoute,
    visibleCount: filteredPlaces.length,
    totalCount: places.length,
    sample,
    degraded: Boolean(degraded),
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#05070a]" data-tod={tod.id}>
      <div className="absolute inset-0">
        {!prefsReady ? (
          <MapSkeleton label="Reading the city…" />
        ) : mode === "3d" ? (
          <Map3D
            apiRef={mapApi}
            places={filteredPlaces}
            selected={selectedPlace}
            tod={tod}
            basemap={basemap}
            heat={heat}
            reducedMotion={reducedMotion}
            routeStops={routeStops}
            routeProgress={routeProgress}
            intro={introCamera && !reducedMotion}
            onSelect={selectPlace}
            onDismiss={dismissPlace}
            onReady={handleReady}
          />
        ) : (
          <Map2D
            apiRef={mapApi}
            places={filteredPlaces}
            selected={selectedPlace}
            tod={tod}
            reducedMotion={reducedMotion}
            routeStops={routeStops}
            routeProgress={routeProgress}
            intro={introCamera && !reducedMotion}
            onSelect={selectPlace}
            onDismiss={dismissPlace}
            onReady={handleReady}
          />
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 z-[5] map-vignette" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 z-[6] map-grain" aria-hidden="true" />

      <Header
        query={query}
        onQueryChange={setQuery}
        results={searchMatches}
        onPickResult={(place) => {
          selectPlace(place);
          setQuery("");
        }}
        tod={tod}
        onTodChange={setTodId}
        mode={mode}
        onModeChange={(next) => {
          setMode(next);
          introPlayed.current = true;
        }}
        onToggleFilters={toggleFilters}
        filtersActive={activeCategories.length > 0 || Boolean(activeNeighbourhood)}
        onAddPlace={() => {
          setSelectedId(null);
          setFiltersOpen(false);
          setAddOpen(true);
        }}
      />

      {!explorerCollapsed ? (
        <ExplorerPanel
          variant="desktop"
          open
          onClose={() => setExplorerCollapsed(true)}
          {...explorerProps}
        />
      ) : null}

      <ExplorerPanel
        variant="mobile"
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        {...explorerProps}
      />

      <IntroOverlay visible={showIntro} onSkip={skipIntro} placeCount={places.length} />

      {selectedPlace ? <PlacePanel place={selectedPlace} onClose={() => setSelectedId(null)} /> : null}

      {addOpen ? <AddPlaceDialog tod={tod} onClose={() => setAddOpen(false)} /> : null}

      <div className="pointer-events-none absolute bottom-0 left-0 z-50 flex max-w-[calc(100%-12px)] flex-wrap items-center gap-2 px-2.5 pb-2">
        {sample ? (
          <span className="pointer-events-auto rounded-full border border-amber-200/25 bg-amber-200/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-amber-100/80 backdrop-blur">
            Sample data
          </span>
        ) : null}
        <p className="pointer-events-auto rounded bg-black/35 px-1.5 py-0.5 font-mono text-[8.5px] leading-relaxed text-white/50 backdrop-blur">
          {attributionText}
        </p>
      </div>

      {activeRoute && routeStops.length > 1 ? (
        <div className="glass absolute bottom-6 left-1/2 z-30 w-[min(420px,calc(100%-32px))] -translate-x-1/2 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="mono-label text-[var(--accent)]">Creative walk</p>
              <p className="truncate text-[12px] text-white/85">{activeRoute.title}</p>
            </div>
            <button type="button" onClick={stopRoute} className="btn shrink-0 px-3 py-1.5 text-[10.5px]">
              Stop
            </button>
          </div>
          <div className="mt-2.5 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-100 ease-linear"
              style={{ width: `${Math.round(routeProgress * 100)}%`, background: "var(--accent)" }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
