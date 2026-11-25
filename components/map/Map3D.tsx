"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import MapLibreMap, { Layer, NavigationControl, ScaleControl, Source, type MapRef } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "maplibre-gl";
import { CATEGORIES, categoryColor, categoryLabel } from "@/lib/categories";
import { LAGOS_CENTER } from "@/lib/neighbourhoods";
import type { Basemap } from "@/lib/map/basemaps";
import {
  clusterProperties,
  dominantClusterColor,
  placesToFeatureCollection,
  routeStopsToFeatureCollection,
  routeToFeatureCollection,
} from "@/lib/map/geojson";
import type { MapHandle } from "@/lib/map/handle";
import { createPinImage, createThumbImage, loadImageElement, pinImageId, thumbImageId } from "@/lib/map/pins";
import { applyAtmosphere, buildMapStyle } from "@/lib/map/style";
import type { TimeOfDayPreset } from "@/lib/time-of-day";
import type { CategoryId, Place } from "@/lib/types";

interface Map3DProps {
  apiRef: MutableRefObject<MapHandle | null>;
  places: Place[];
  selected: Place | null;
  tod: TimeOfDayPreset;
  basemap: Basemap;
  heat: boolean;
  reducedMotion: boolean;
  routeStops: Place[];
  routeProgress: number;
  intro: boolean;
  onSelect: (place: Place) => void;
  onDismiss: () => void;
  onReady: () => void;
}

function toImageData(canvas: HTMLCanvasElement): ImageData {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

const SELECTED_SOURCE = "selected-place";
const PLACES_SOURCE = "places";
const ROUTE_SOURCE = "route";

function lineGradient(progress: number, accent: string) {
  if (progress <= 0) {
    return ["interpolate", ["linear"], ["line-progress"], 0, "rgba(0,0,0,0)", 1, "rgba(0,0,0,0)"];
  }
  const p = Math.min(1, progress);
  if (p >= 1) return ["interpolate", ["linear"], ["line-progress"], 0, accent, 1, accent];
  return [
    "interpolate",
    ["linear"],
    ["line-progress"],
    0,
    accent,
    p,
    accent,
    Math.min(1, p + 0.002),
    "rgba(0,0,0,0)",
  ];
}

export function Map3D({
  apiRef,
  places,
  selected,
  tod,
  basemap,
  heat,
  reducedMotion,
  routeStops,
  routeProgress,
  intro,
  onSelect,
  onDismiss,
  onReady,
}: Map3DProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [renderedPlaces, setRenderedPlaces] = useState<Place[]>([]);
  const [hover, setHover] = useState<{ x: number; y: number; name: string; category: string } | null>(null);
  const thumbsFetched = useRef<Set<string>>(new Set());
  const placesById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);

  const initialStyle = useMemo(() => buildMapStyle(basemap, tod), []); // eslint-disable-line react-hooks/exhaustive-deps

  const placesData = useMemo(() => placesToFeatureCollection(renderedPlaces), [renderedPlaces]);
  const routeLine = useMemo(() => routeToFeatureCollection(routeStops), [routeStops]);
  const routePoints = useMemo(() => routeStopsToFeatureCollection(routeStops), [routeStops]);
  const selectedData = useMemo(
    () => placesToFeatureCollection(selected ? [selected] : []),
    [selected],
  );

  const getMap = useCallback(() => mapRef.current?.getMap() ?? null, []);

  const padding = useCallback(() => {
    if (typeof window === "undefined") return { top: 120, bottom: 120, left: 380, right: 420 };
    const wide = window.innerWidth >= 1024;
    return wide
      ? { top: 120, bottom: 120, left: 380, right: 430 }
      : { top: 180, bottom: 260, left: 40, right: 40 };
  }, []);

  useEffect(() => {
    apiRef.current = {
      flyToPlace(place) {
        const map = getMap();
        if (!map) return;
        map.flyTo({
          center: [place.lng, place.lat],
          zoom: Math.max(map.getZoom(), 15.4),
          pitch: 56,
          bearing: map.getBearing(),
          duration: reducedMotion ? 0 : 1800,
          essential: true,
          curve: 1.32,
          speed: 0.85,
          padding: padding(),
        });
      },
      flyToCoords(lng, lat, options) {
        const map = getMap();
        if (!map) return;
        map.flyTo({
          center: [lng, lat],
          zoom: options?.zoom ?? 14.8,
          pitch: options?.pitch ?? 58,
          bearing: options?.bearing ?? map.getBearing(),
          duration: reducedMotion ? 0 : options?.duration ?? 1800,
          essential: true,
          curve: 1.32,
          speed: 0.85,
          padding: padding(),
        });
      },
      flyToNeighbourhood(neighbourhood) {
        const map = getMap();
        if (!map) return;
        map.flyTo({
          center: neighbourhood.center,
          zoom: neighbourhood.zoom,
          pitch: neighbourhood.pitch,
          bearing: neighbourhood.bearing,
          duration: reducedMotion ? 0 : 1800,
          essential: true,
          curve: 1.3,
          speed: 0.85,
          padding: padding(),
        });
      },
      fitRoute(stops) {
        const map = getMap();
        if (!map || stops.length === 0) return;
        const lngs = stops.map((stop) => stop.lng);
        const lats = stops.map((stop) => stop.lat);
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          {
            padding: padding(),
            pitch: 48,
            bearing: -22,
            maxZoom: 15,
            duration: reducedMotion ? 0 : 1800,
          },
        );
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, getMap, padding, reducedMotion]);

  const registerImages = useCallback(() => {
    const map = getMap();
    if (!map) return;
    for (const category of CATEGORIES) {
      const id = pinImageId(category.id);
      if (map.hasImage(id)) continue;
      try {
        map.addImage(id, toImageData(createPinImage(category.color, 1)), { pixelRatio: 2 });
      } catch (error) {
        console.warn(`[map] could not register ${id}`, error);
      }
    }
  }, [getMap]);

  const handleLoad = useCallback(() => {
    // Pins must exist before the symbol layer mounts, or MapLibre warns on the
    // very first frame. Thumbnails are handled in the gated effect below.
    registerImages();
    setLoaded(true);
    onReady();
  }, [onReady, registerImages]);

  // Register thumbnails, then publish the features. Markers never render an
  // image id that has not been added yet.
  useEffect(() => {
    if (!loaded) return;
    const map = getMap();
    if (!map) return;

    for (const place of places) {
      if (place.category !== "street-art") continue;
      const id = thumbImageId(place.id);
      if (!map.hasImage(id)) {
        const color = categoryColor(place.category);
        map.addImage(id, toImageData(createThumbImage(color)), { pixelRatio: 2 });
      }

      const photo = place.images[0];
      if (!photo || thumbsFetched.current.has(id)) continue;
      thumbsFetched.current.add(id);
      const color = categoryColor(place.category);
      void loadImageElement(photo).then((image) => {
        if (image && map.hasImage(id)) {
          map.updateImage(id, toImageData(createThumbImage(color, image)));
        }
      });
    }

    setRenderedPlaces(places);
  }, [loaded, places, getMap]);

  useEffect(() => {
    if (!loaded) return;
    const map = getMap();
    if (!map) return;
    applyAtmosphere(map, tod, reducedMotion);
  }, [tod, loaded, reducedMotion, getMap]);

  useEffect(() => {
    const map = getMap();
    if (!map || !loaded) return;
    if (map.getLayer("route-progress")) {
      map.setPaintProperty("route-progress", "line-gradient", lineGradient(routeProgress, tod.accent) as never);
    }
  }, [routeProgress, tod.accent, loaded, getMap, routeStops.length]);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const map = getMap();
      const feature = event.features?.[0];
      if (!map || !feature) {
        onDismiss();
        return;
      }
      if (feature.layer?.id === "clusters" || feature.properties?.cluster) {
        const clusterId = feature.properties.cluster_id as number;
        const source = map.getSource(PLACES_SOURCE) as unknown as {
          getClusterExpansionZoom(id: number): Promise<number>;
        };
        const coordinates = (feature.geometry as unknown as { coordinates: [number, number] })
          .coordinates;
        void source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({ center: coordinates, zoom, duration: reducedMotion ? 0 : 900 });
        });
        return;
      }
      const id = feature.properties?.id as string | undefined;
      if (id) {
        const place = placesById.get(id);
        if (place) {
          onSelect(place);
          return;
        }
      }
      onDismiss();
    },
    [getMap, onDismiss, onSelect, placesById, reducedMotion],
  );

  const handleMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const map = getMap();
      const feature = event.features?.[0];
      if (!map) return;
      if (feature && feature.layer?.id === "places-pins" && feature.properties) {
        map.getCanvas().style.cursor = "pointer";
        setHover({
          x: event.point.x,
          y: event.point.y,
          name: String(feature.properties.name ?? ""),
          category: String(feature.properties.category ?? ""),
        });
      } else if (feature && feature.layer?.id === "clusters") {
        map.getCanvas().style.cursor = "pointer";
        setHover(null);
      } else {
        map.getCanvas().style.cursor = "";
        setHover(null);
      }
    },
    [getMap],
  );

  const handleMouseLeave = useCallback(() => {
    setHover(null);
    const map = getMap();
    if (map) map.getCanvas().style.cursor = "";
  }, [getMap]);

  return (
    <div className="absolute inset-0">
      <MapLibreMap
        ref={mapRef}
        initialViewState={{
          longitude: LAGOS_CENTER[0],
          latitude: LAGOS_CENTER[1],
          zoom: intro ? 10.6 : 12.4,
          pitch: intro ? 32 : 60,
          bearing: intro ? 6 : -20,
        }}
        mapStyle={initialStyle}
        maxPitch={75}
        minZoom={8}
        maxZoom={19.5}
        attributionControl={false}
        dragRotate
        pitchWithRotate
        onLoad={handleLoad}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        interactiveLayerIds={["clusters", "places-pins"]}
        style={{ width: "100%", height: "100%" }}
        reuseMaps
      >
        <Source
          id={PLACES_SOURCE}
          type="geojson"
          data={placesData}
          cluster
          clusterMaxZoom={15}
          clusterRadius={52}
          clusterProperties={clusterProperties()}
        >
          <Layer
            id="creative-density"
            type="heatmap"
            filter={["!", ["has", "point_count"]]}
            layout={{ visibility: heat ? "visible" : "none" }}
            paint={{
              "heatmap-weight": 1,
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 9, 0.5, 15, 1.6],
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 14, 13, 34, 17, 60],
              "heatmap-opacity": 0.78,
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(0,0,0,0)",
                0.18,
                "rgba(255,178,104,0.22)",
                0.4,
                "rgba(255,126,182,0.38)",
                0.65,
                "rgba(190,156,255,0.55)",
                0.85,
                "rgba(111,227,210,0.72)",
                1,
                tod.accent,
              ],
            }}
          />

          <Layer
            id="approximate-rings"
            type="circle"
            filter={["all", ["!", ["has", "point_count"]], ["==", ["get", "approximate"], true]]}
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 10, 16, 34],
              "circle-color": tod.accent,
              "circle-opacity": 0.1,
              "circle-blur": 0.7,
              "circle-stroke-width": 1,
              "circle-stroke-color": tod.accent,
              "circle-stroke-opacity": 0.45,
            }}
          />

          <Layer
            id="cluster-glow"
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-radius": ["step", ["get", "point_count"], 26, 10, 34, 25, 44],
              "circle-color": dominantClusterColor() as never,
              "circle-opacity": 0.14 * Math.max(0.4, tod.glowOpacity),
              "circle-blur": 1,
            }}
          />

          <Layer
            id="clusters"
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-color": dominantClusterColor() as never,
              "circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 30, 27],
              "circle-opacity": 0.82,
              "circle-stroke-width": 1.2,
              "circle-stroke-color": "rgba(8,11,16,0.9)",
              "circle-blur": 0.1,
            }}
          />

          <Layer
            id="cluster-count"
            type="symbol"
            filter={["has", "point_count"]}
            layout={{
              "text-field": ["get", "point_count_abbreviated"],
              "text-font": ["Noto Sans Regular"],
              "text-size": 11,
              "text-letter-spacing": 0.04,
              "text-allow-overlap": true,
            }}
            paint={{ "text-color": "#07090d" }}
          />

          <Layer
            id="marker-glow"
            type="circle"
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 8, 16, 26],
              "circle-color": ["match", ["get", "category"], ...CATEGORIES.flatMap((c) => [c.id, c.color]), "#C9D2DA"] as never,
              "circle-opacity": 0.18 * tod.glowOpacity,
              "circle-blur": 1,
            }}
          />

          <Layer
            id="places-pins"
            type="symbol"
            filter={["!", ["has", "point_count"]]}
            layout={{
              "icon-image": [
                "case",
                ["==", ["get", "category"], "street-art"],
                ["concat", "thumb-", ["get", "id"]],
                ["concat", "pin-", ["get", "category"]],
              ],
              "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.55, 13, 0.74, 16, 0.95],
              "icon-anchor": "bottom",
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              "icon-pitch-alignment": "viewport",
              "icon-rotation-alignment": "viewport",
            }}
          />
        </Source>

        <Source id={SELECTED_SOURCE} type="geojson" data={selectedData}>
          <Layer
            id="selected-halo"
            type="circle"
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 16, 16, 46],
              "circle-color": "rgba(0,0,0,0)",
              "circle-stroke-width": 2,
              "circle-stroke-color": tod.accent,
              "circle-stroke-opacity": 0.9,
              "circle-blur": 0.2,
            }}
          />
        </Source>

        {routeStops.length > 1 ? (
          <Source id={ROUTE_SOURCE} type="geojson" data={routeLine} lineMetrics>
            <Layer
              id="route-base"
              type="line"
              paint={{
                "line-color": "#F4F7FA",
                "line-opacity": 0.2,
                "line-width": 2,
                "line-dasharray": [2, 3],
              }}
            />
            <Layer
              id="route-progress"
              type="line"
              paint={{
                "line-width": 3.5,
                "line-color": tod.accent,
                "line-gradient": lineGradient(routeProgress, tod.accent) as never,
                "line-opacity": 0.95,
              }}
            />
          </Source>
        ) : null}

        {routeStops.length > 0 ? (
          <Source id="route-stops" type="geojson" data={routePoints}>
            <Layer
              id="route-stop-dots"
              type="circle"
              paint={{
                "circle-radius": 11,
                "circle-color": "#06090d",
                "circle-stroke-width": 2,
                "circle-stroke-color": tod.accent,
              }}
            />
            <Layer
              id="route-stop-labels"
              type="symbol"
              layout={{
                "text-field": ["get", "label"],
                "text-font": ["Noto Sans Regular"],
                "text-size": 10,
                "text-allow-overlap": true,
              }}
              paint={{ "text-color": "#F4F7FA" }}
            />
          </Source>
        ) : null}

        <NavigationControl position="top-right" showCompass visualizePitch />
        <ScaleControl position="bottom-right" unit="metric" />
      </MapLibreMap>

      {hover ? (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+18px)]"
          style={{ left: hover.x, top: hover.y }}
          role="presentation"
        >
          <div className="glass rounded-xl px-3 py-2">
            <p className="text-[12px] font-normal leading-tight text-white">{hover.name}</p>
            <p className="mono-label mt-1" style={{ color: categoryColor(hover.category as CategoryId) }}>
              {categoryLabel(hover.category)}
            </p>
          </div>
        </div>
      ) : null}

      {!loaded ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-[#05070a]">
          <p className="mono-label animate-pulse">Assembling Lagos…</p>
        </div>
      ) : null}
    </div>
  );
}
