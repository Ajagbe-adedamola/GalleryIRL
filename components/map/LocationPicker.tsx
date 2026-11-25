"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import { LAGOS_CENTER } from "@/lib/neighbourhoods";
import type { TimeOfDayPreset } from "@/lib/time-of-day";

interface LocationPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
  tod: TimeOfDayPreset;
}

export function LocationPicker({ value, onChange, tod }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: value ? [value.lat, value.lng] : [LAGOS_CENTER[1], LAGOS_CENTER[0]],
        zoom: value ? 14 : 11.6,
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      const pinIcon = L.divIcon({
        className: "",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        html: `<div class="map-pin-2d" style="--pin-color:#F4F7FA;--pin-glow:rgba(255,255,255,0.4)"></div>`,
      });

      if (value) {
        markerRef.current = L.marker([value.lat, value.lng], { icon: pinIcon, draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const position = markerRef.current?.getLatLng();
          if (position) onChangeRef.current({ lat: position.lat, lng: position.lng });
        });
      }

      map.on("click", (event: Leaflet.LeafletMouseEvent) => {
        const coords = { lat: event.latlng.lat, lng: event.latlng.lng };
        if (markerRef.current) markerRef.current.setLatLng(event.latlng);
        else {
          markerRef.current = L.marker(event.latlng, { icon: pinIcon, draggable: true }).addTo(map);
          markerRef.current.on("dragend", () => {
            const position = markerRef.current?.getLatLng();
            if (position) onChangeRef.current({ lat: position.lat, lng: position.lng });
          });
        }
        onChangeRef.current(coords);
      });

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 120);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !value) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lng]);
    } else {
      const pinIcon = L.divIcon({
        className: "",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        html: `<div class="map-pin-2d" style="--pin-color:#F4F7FA;--pin-glow:rgba(255,255,255,0.4)"></div>`,
      });
      markerRef.current = L.marker([value.lat, value.lng], { icon: pinIcon, draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const position = markerRef.current?.getLatLng();
        if (position) onChangeRef.current({ lat: position.lat, lng: position.lng });
      });
    }
  }, [value]);

  const filter =
    tod.id === "night"
      ? "brightness(0.55) saturate(0.6) contrast(1.05)"
      : tod.id === "dusk"
        ? "brightness(0.8) saturate(0.9)"
        : "brightness(1) saturate(0.95)";

  return (
    <div
      className="relative h-52 overflow-hidden rounded-xl border border-white/10"
      style={{ ["--tile-filter" as string]: filter }}
    >
      <div ref={containerRef} className="h-full w-full" aria-label="Location picker map" role="application" />
      <div className="pointer-events-none absolute inset-0 map-vignette" aria-hidden="true" />
      <p className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-white/60">
        Tap the map to set a location
      </p>
    </div>
  );
}
