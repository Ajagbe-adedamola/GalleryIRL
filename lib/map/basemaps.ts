export type BasemapId = "maptiler" | "esri" | "stadia" | "protomaps";

export interface BasemapImagery {
  tiles: string[];
  tileSize: number;
  maxzoom: number;
  attribution: string;
}

export interface BasemapVector {
  url?: string;
  tiles?: string[];
  /** Field naming used by the vector tiles. */
  schema: "openmaptiles" | "protomaps";
  attribution: string;
  maxzoom?: number;
}

export interface Basemap {
  id: BasemapId;
  label: string;
  kind: "satellite" | "vector";
  imagery?: BasemapImagery;
  vector: BasemapVector;
  note?: string;
}

const OPENFREEMAP_VECTOR: BasemapVector = {
  url: "https://tiles.openfreemap.org/planet",
  schema: "openmaptiles",
  attribution: "© OpenFreeMap · © OpenMapTiles · Data © OpenStreetMap contributors",
  maxzoom: 14,
};

const OSM_ATTRIBUTION = "Data © OpenStreetMap contributors";

export function resolveBasemap(): { basemap: Basemap; attribution: string[]; fallbackFrom?: BasemapId } {
  const requested = (process.env.NEXT_PUBLIC_BASEMAP_PROVIDER ?? "").trim().toLowerCase();
  const maptilerKey = (process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "").trim();
  const stadiaKey = (process.env.NEXT_PUBLIC_STADIA_KEY ?? "").trim();
  const protomapsKey = (process.env.NEXT_PUBLIC_PROTOMAPS_KEY ?? "").trim();

  const maptiler: Basemap = {
    id: "maptiler",
    label: "MapTiler Satellite",
    kind: "satellite",
    imagery: {
      tiles: [`https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${maptilerKey}`],
      tileSize: 512,
      maxzoom: 20,
      attribution: "© MapTiler © OpenStreetMap contributors",
    },
    vector: OPENFREEMAP_VECTOR,
  };

  const esri: Basemap = {
    id: "esri",
    label: "Esri World Imagery",
    kind: "satellite",
    imagery: {
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
    vector: OPENFREEMAP_VECTOR,
  };

  const stadia: Basemap = {
    id: "stadia",
    label: "Stadia Alidade Satellite",
    kind: "satellite",
    imagery: {
      tiles: [
        `https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}.jpg?api_key=${stadiaKey}`,
      ],
      tileSize: 256,
      maxzoom: 20,
      attribution: "© Stadia Maps © OpenMapTiles © OpenStreetMap contributors",
    },
    vector: OPENFREEMAP_VECTOR,
  };

  const protomaps: Basemap = {
    id: "protomaps",
    label: "Protomaps Dark",
    kind: "vector",
    vector: {
      url: `https://api.protomaps.com/tiles/v4.json?key=${protomapsKey}`,
      schema: "protomaps",
      attribution: "© Protomaps · Data © OpenStreetMap contributors",
      maxzoom: 15,
    },
    note: "Vector basemap — no satellite imagery.",
  };

  let basemap: Basemap;
  let fallbackFrom: BasemapId | undefined;

  const pick = (id: BasemapId): Basemap | null => {
    if (id === "maptiler") return maptilerKey ? maptiler : null;
    if (id === "stadia") return stadiaKey ? stadia : null;
    if (id === "protomaps") return protomapsKey ? protomaps : null;
    return esri;
  };

  const wanted = (["maptiler", "esri", "stadia", "protomaps"] as BasemapId[]).includes(
    requested as BasemapId,
  )
    ? (requested as BasemapId)
    : null;

  if (wanted) {
    const selected = pick(wanted);
    if (selected) {
      basemap = selected;
    } else {
      basemap = maptilerKey ? maptiler : esri;
      fallbackFrom = wanted;
    }
  } else {
    basemap = maptilerKey ? maptiler : esri;
  }

  const lines = [basemap.imagery?.attribution, basemap.vector.attribution].filter(
    (line): line is string => Boolean(line),
  );
  if (!/openstreetmap/i.test(lines.join(" "))) lines.push(OSM_ATTRIBUTION);

  return { basemap, attribution: lines, fallbackFrom };
}
