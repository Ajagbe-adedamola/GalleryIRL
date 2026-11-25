import { CATEGORIES } from "../categories";
import { approximateLocation } from "../geo";
import type { Place } from "../types";

export interface PlaceFeatureProperties {
  id: string;
  slug: string;
  name: string;
  category: string;
  neighbourhood: string;
  approximate: boolean;
  verified: boolean;
  [key: string]: unknown;
}

export function placesToFeatureCollection(places: Place[]) {
  return {
    type: "FeatureCollection" as const,
    features: places.map((place) => {
      const coords = place.approximate ? approximateLocation(place.lat, place.lng) : { lat: place.lat, lng: place.lng };
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [coords.lng, coords.lat],
        },
        properties: {
          id: place.id,
          slug: place.slug,
          name: place.name,
          category: place.category,
          neighbourhood: place.neighbourhood,
          approximate: place.approximate,
          verified: place.verified,
        } satisfies PlaceFeatureProperties,
      };
    }),
  };
}

/** Counts per category carried through the cluster aggregation. */
export function clusterProperties(): Record<string, unknown> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [
      `count_${category.id}`,
      ["+", ["case", ["==", ["get", "category"], category.id], 1, 0]],
    ]),
  );
}

/** Cluster tint picks the category with the highest count inside the cluster. */
export function dominantClusterColor(): unknown {
  const ids = CATEGORIES.map((category) => category.id);
  const counts = ids.map((id) => ["coalesce", ["get", `count_${id}`], 0]);
  const max = ["max", ...counts];

  const cases: unknown[] = [];
  ids.forEach((id, index) => {
    cases.push(["==", counts[index], max], CATEGORIES[index].color);
  });
  cases.push("#C9D2DA");
  return ["case", ...cases];
}

export function routeToFeatureCollection(stops: Place[]) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: stops.map((place) => [place.lng, place.lat]),
        },
        properties: { id: "route-line" },
      },
    ],
  };
}

export function routeStopsToFeatureCollection(stops: Place[]) {
  return {
    type: "FeatureCollection" as const,
    features: stops.map((place, index) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [place.lng, place.lat],
      },
      properties: {
        index: index + 1,
        label: String(index + 1).padStart(2, "0"),
        name: place.name,
        id: place.id,
      },
    })),
  };
}
