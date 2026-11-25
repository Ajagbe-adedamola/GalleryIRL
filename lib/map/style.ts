import type { LayerSpecification, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import type { Basemap } from "./basemaps";
import type { TimeOfDayPreset } from "../time-of-day";

export const SATELLITE_SOURCE = "satellite";
export const VECTOR_SOURCE = "vector";
export const BUILDING_LAYER = "buildings-3d";
export const LABEL_LAYER = "place-labels";
export const ROAD_LAYERS = ["roads-minor", "roads-major", "roads-motorway"];

const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function mixHex(from: string, to: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  const ratio = clamp(t);
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(r1 + (r2 - r1) * ratio)}${toHex(g1 + (g2 - g1) * ratio)}${toHex(b1 + (b2 - b1) * ratio)}`;
}

function buildingPaint(tod: TimeOfDayPreset, schema: "openmaptiles" | "protomaps") {
  const height =
    schema === "openmaptiles"
      ? ["coalesce", ["get", "render_height"], ["get", "height"], 8]
      : ["coalesce", ["get", "height"], ["get", "building_height"], 8];

  return {
    "fill-extrusion-color": [
      "interpolate",
      ["linear"],
      height,
      0,
      tod.buildingBase,
      18,
      mixHex(tod.buildingBase, tod.buildingTop, 0.24),
      55,
      mixHex(tod.buildingBase, tod.buildingTop, 0.52),
      130,
      mixHex(tod.buildingBase, tod.buildingTop, 0.82),
      260,
      tod.buildingTop,
    ],
    "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14, 0, 14.4, height],
    "fill-extrusion-base": schema === "openmaptiles" ? ["get", "render_min_height"] : 0,
    "fill-extrusion-opacity": 0.86,
    "fill-extrusion-vertical-gradient": true,
  } as Record<string, unknown>;
}

function skyPaint(tod: TimeOfDayPreset) {
  return {
    "sky-color": tod.skyColor,
    "sky-horizon-blend": 0.55,
    "horizon-color": tod.horizonColor,
    "horizon-fog-blend": 0.6,
    "fog-color": tod.fogColor,
    "fog-ground-blend": 0.9,
    "atmosphere-blend": 0.55,
  } as Record<string, unknown>;
}

export function buildMapStyle(basemap: Basemap, tod: TimeOfDayPreset): StyleSpecification {
  const schema = basemap.vector.schema;
  const sources: StyleSpecification["sources"] = {};
  const layers: LayerSpecification[] = [];

  if (basemap.imagery) {
    sources[SATELLITE_SOURCE] = {
      type: "raster",
      tiles: basemap.imagery.tiles,
      tileSize: basemap.imagery.tileSize,
      maxzoom: basemap.imagery.maxzoom,
      attribution: basemap.imagery.attribution,
    };
  }

  sources[VECTOR_SOURCE] = basemap.vector.url
    ? {
        type: "vector",
        url: basemap.vector.url,
        ...(basemap.vector.maxzoom ? { maxzoom: basemap.vector.maxzoom } : {}),
        attribution: basemap.vector.attribution,
      }
    : {
        type: "vector",
        tiles: basemap.vector.tiles ?? [],
        ...(basemap.vector.maxzoom ? { maxzoom: basemap.vector.maxzoom } : {}),
        attribution: basemap.vector.attribution,
      };

  layers.push({
    id: "background",
    type: "background",
    paint: { "background-color": tod.skyColor },
  });

  if (!basemap.imagery) {
    // Vector-only provider: a restrained land/water base, never a flat blue wash.
    layers.push({
      id: "vector-earth",
      type: "fill",
      source: VECTOR_SOURCE,
      "source-layer": "earth",
      paint: { "fill-color": mixHex(tod.buildingBase, "#0b0d10", 0.72) },
    });
    layers.push({
      id: "vector-water",
      type: "fill",
      source: VECTOR_SOURCE,
      "source-layer": "water",
      paint: { "fill-color": mixHex(tod.fogColor, "#04141b", 0.72) },
    });
  }

  if (basemap.imagery) {
    layers.push({
      id: SATELLITE_SOURCE,
      type: "raster",
      source: SATELLITE_SOURCE,
      paint: {
        "raster-opacity": 1,
        "raster-resampling": "linear",
        "raster-fade-duration": 250,
        "raster-brightness-min": 0.04,
        "raster-brightness-max": tod.rasterBrightnessMax,
        "raster-saturation": tod.rasterSaturation,
        "raster-contrast": tod.rasterContrast,
      },
    });
  }

  const roadSourceLayer = schema === "openmaptiles" ? "transportation" : "roads";
  const roadFilter =
    schema === "openmaptiles"
      ? ["match", ["get", "class"], ["motorway", "trunk"], true, false]
      : ["match", ["get", "kind"], ["highway"], true, false];

  layers.push({
    id: "roads-minor",
    type: "line",
    source: VECTOR_SOURCE,
    "source-layer": roadSourceLayer,
    minzoom: 11,
    filter:
      schema === "openmaptiles"
        ? ["match", ["get", "class"], ["street", "street_limited", "service", "tertiary"], true, false]
        : ["match", ["get", "kind"], ["minor", "medium"], true, false],
    paint: {
      "line-color": tod.roadColor,
      "line-opacity": 0.22,
      "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.4, 16, 1.6, 19, 3.2],
      "line-blur": 0.3,
    },
  });

  layers.push({
    id: "roads-major",
    type: "line",
    source: VECTOR_SOURCE,
    "source-layer": roadSourceLayer,
    minzoom: 9,
    filter:
      schema === "openmaptiles"
        ? ["match", ["get", "class"], ["primary", "secondary"], true, false]
        : ["match", ["get", "kind"], ["major"], true, false],
    paint: {
      "line-color": tod.roadColor,
      "line-opacity": 0.34,
      "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.4, 14, 1.4, 19, 4],
      "line-blur": 0.4,
    },
  });

  layers.push({
    id: "roads-motorway",
    type: "line",
    source: VECTOR_SOURCE,
    "source-layer": roadSourceLayer,
    minzoom: 8,
    filter: roadFilter as never,
    paint: {
      "line-color": mixHex(tod.roadColor, tod.accent, 0.32),
      "line-opacity": 0.42,
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 13, 1.8, 19, 5],
      "line-blur": 0.5,
    },
  });

  layers.push({
    id: BUILDING_LAYER,
    type: "fill-extrusion",
    source: VECTOR_SOURCE,
    "source-layer": "building",
    minzoom: 14,
    paint: buildingPaint(tod, schema),
  });

  layers.push({
    id: LABEL_LAYER,
    type: "symbol",
    source: VECTOR_SOURCE,
    "source-layer": schema === "openmaptiles" ? "place" : "places",
    minzoom: 9.5,
    filter:
      schema === "openmaptiles"
        ? [
            "all",
            ["has", "name"],
            [
              "match",
              ["get", "class"],
              ["city", "town", "suburb", "neighbourhood", "quarter", "village", "borough"],
              true,
              false,
            ],
          ]
        : ["has", "name"],
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 15, 14, 18, 17],
      "text-letter-spacing": 0.12,
      "text-transform": "uppercase",
      "text-max-width": 8,
      "text-padding": 6,
      "symbol-sort-key": ["get", "rank"],
    },
    paint: {
      "text-color": tod.labelColor,
      "text-halo-color": "rgba(3,6,10,0.72)",
      "text-halo-width": 1.2,
      "text-halo-blur": 0.4,
      "text-opacity": 0.78,
    },
  });

  return {
    version: 8,
    name: "Lagos Street Culture Map",
    glyphs: GLYPHS,
    sources,
    layers,
    // MapLibre 5 renders sky and atmosphere at the style root (no fog layer).
    sky: skyPaint(tod) as never,
    light: {
      anchor: "viewport",
      color: tod.lightColor,
      intensity: tod.lightIntensity,
      position: tod.sunPosition,
    } as never,
  };
}

/** Re-tints the running map when the time of day changes. */
export function applyAtmosphere(map: MapLibreMap, tod: TimeOfDayPreset, reducedMotion: boolean) {
  const elevation = reducedMotion ? 0 : 1;
  const set = (layer: string, prop: string, value: unknown) => {
    if (map.getLayer(layer)) {
      try {
        map.setPaintProperty(layer, prop, value as never);
      } catch {
        /* layer may still be loading */
      }
    }
  };

  try {
    map.setSky(skyPaint(tod) as never);
  } catch {
    /* sky unsupported */
  }

  if (map.getLayer(SATELLITE_SOURCE)) {
    set(SATELLITE_SOURCE, "raster-brightness-max", tod.rasterBrightnessMax);
    set(SATELLITE_SOURCE, "raster-saturation", tod.rasterSaturation);
    set(SATELLITE_SOURCE, "raster-contrast", tod.rasterContrast);
  }

  for (const id of ROAD_LAYERS) {
    set(id, "line-color", tod.roadColor);
  }

  if (map.getLayer(BUILDING_LAYER)) {
    const schema = "openmaptiles";
    const paint = buildingPaint(tod, schema);
    set(BUILDING_LAYER, "fill-extrusion-color", paint["fill-extrusion-color"]);
  }

  set(LABEL_LAYER, "text-color", tod.labelColor);

  const maybeLight = (map as unknown as { setLight?: (light: unknown) => void }).setLight;
  if (typeof maybeLight === "function") {
    maybeLight.call(map, {
      anchor: "viewport",
      color: tod.lightColor,
      intensity: tod.lightIntensity * (0.6 + 0.4 * elevation),
      position: tod.sunPosition,
    });
  }
}
