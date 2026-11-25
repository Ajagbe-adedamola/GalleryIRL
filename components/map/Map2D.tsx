"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type * as Leaflet from "leaflet";
import { categoryColor, categoryLabel } from "@/lib/categories";
import { haversineMeters } from "@/lib/geo";
import { LAGOS_CENTER } from "@/lib/neighbourhoods";
import type { MapHandle } from "@/lib/map/handle";
import type { TimeOfDayPreset } from "@/lib/time-of-day";
import type { Place } from "@/lib/types";

interface Map2DProps {
  apiRef: MutableRefObject<MapHandle | null>;
  places: Place[];
  selected: Place | null;
  tod: TimeOfDayPreset;
  reducedMotion: boolean;
  routeStops: Place[];
  routeProgress: number;
  intro: boolean;
  onSelect: (place: Place) => void;
  onDismiss: () => void;
  onReady: () => void;
}

function partialLine(stops: Place[], progress: number): [number, number][] {
  if (stops.length < 2) return [];
  const totalDistance =
    stops.reduce((sum, stop, index) => {
      if (index === 0) return 0;
      return sum + haversineMeters(stops[index - 1], stop);
    }, 0) || 1;

  const target = totalDistance * Math.min(1, Math.max(0, progress));
  const line: [number, number][] = [[stops[0].lat, stops[0].lng]];
  let travelled = 0;

  for (let index = 1; index < stops.length; index += 1) {
    const from = stops[index - 1];
    const to = stops[index];
    const segment = haversineMeters(from, to);
    if (travelled + segment <= target) {
      line.push([to.lat, to.lng]);
      travelled += segment;
      continue;
    }
    const ratio = segment === 0 ? 0 : (target - travelled) / segment;
    line.push([from.lat + (to.lat - from.lat) * ratio, from.lng + (to.lng - from.lng) * ratio]);
    break;
  }
  return line;
}

export function Map2D({
  apiRef,
  places,
  selected,
  tod,
  reducedMotion,
  routeStops,
  routeProgress,
  intro,
  onSelect,
  onDismiss,
  onReady,
}: Map2DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const markerLayer = useRef<Leaflet.LayerGroup | null>(null);
  const routeLayer = useRef<Leaflet.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const onDismissRef = useRef(onDismiss);

  onSelectRef.current = onSelect;
  onDismissRef.current = onDismiss;

  const tileFilter = useMemo(() => {
    const map: Record<string, string> = {
      morning: "brightness(1.02) saturate(0.9) contrast(1.02)",
      golden: "brightness(1) saturate(1.05) contrast(1.02) sepia(0.08)",
      dusk: "brightness(0.76) saturate(0.88) contrast(1.08)",
      night: "brightness(0.5) saturate(0.55) contrast(1.1)",
    };
    return map[tod.id] ?? "none";
  }, [tod.id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        center: [LAGOS_CENTER[1], LAGOS_CENTER[0]],
        zoom: intro ? 11 : 12,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        crossOrigin: true,
      }).addTo(map);
      markerLayer.current = L.layerGroup().addTo(map);
      routeLayer.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      map.on("click", () => onDismissRef.current());
      setReady(true);
      onReady();
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [intro, onReady]);

  useEffect(() => {
    if (!ready) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = markerLayer.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();

    for (const place of places) {
      const color = categoryColor(place.category);
      const icon = L.divIcon({
        className: "",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        html: `<div class="map-pin-2d" data-selected="${place.id === selected?.id}" style="--pin-color:${color};--pin-glow:${color}66"></div>`,
      });
      const marker = L.marker([place.lat, place.lng], { icon, title: place.name, alt: place.name });
      marker.bindTooltip(`${place.name} · ${categoryLabel(place.category)}`, {
        direction: "top",
        offset: [0, -10],
        opacity: 1,
      });
      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        onSelectRef.current(place);
      });
      marker.addTo(layer);
    }
  }, [places, selected, ready]);

  useEffect(() => {
    if (!ready) return;
    const L = leafletRef.current;
    const layer = routeLayer.current;
    if (!L || !layer) return;
    layer.clearLayers();
    if (routeStops.length < 2) return;

    const line = partialLine(routeStops, routeProgress);
    if (line.length > 1) {
      L.polyline(line, {
        color: tod.accent,
        weight: 3.5,
        opacity: 0.95,
        lineCap: "round",
      }).addTo(layer);
    }

    routeStops.forEach((stop, index) => {
      const icon = L.divIcon({
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        html: `<div class="map-stop-2d">${String(index + 1).padStart(2, "0")}</div>`,
      });
      L.marker([stop.lat, stop.lng], { icon, alt: `Stop ${index + 1}: ${stop.name}` })
        .bindTooltip(`Stop ${index + 1} · ${stop.name}`, { direction: "top", offset: [0, -12], opacity: 1 })
        .on("click", () => onSelectRef.current(stop))
        .addTo(layer);
    });
  }, [routeStops, routeProgress, tod.accent, ready]);

  useEffect(() => {
    apiRef.current = {
      flyToPlace(place) {
        const map = mapRef.current;
        if (!map) return;
        map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 15.3), {
          duration: reducedMotion ? 0 : 1.8,
          easeLinearity: 0.25,
        });
      },
      flyToCoords(lng, lat, options) {
        const map = mapRef.current;
        if (!map) return;
        map.flyTo([lat, lng], options?.zoom ?? 14.8, {
          duration: reducedMotion ? 0 : (options?.duration ?? 1800) / 1000,
          easeLinearity: 0.25,
        });
      },
      flyToNeighbourhood(neighbourhood) {
        const map = mapRef.current;
        if (!map) return;
        map.flyTo([neighbourhood.center[1], neighbourhood.center[0]], neighbourhood.zoom, {
          duration: reducedMotion ? 0 : 1.8,
          easeLinearity: 0.25,
        });
      },
      fitRoute(stops) {
        const map = mapRef.current;
        if (!map || stops.length === 0) return;
        const bounds = stops.map((stop) => [stop.lat, stop.lng]) as [number, number][];
        map.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 15,
          animate: !reducedMotion,
          duration: reducedMotion ? 0 : 1.8,
        });
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, reducedMotion]);

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ ["--tile-filter" as string]: tileFilter }}
        aria-label="Map of Lagos creative places (2D map)"
        role="application"
      />
      <div className="pointer-events-none absolute inset-0 map-vignette" aria-hidden="true" />
    </div>
  );
}
