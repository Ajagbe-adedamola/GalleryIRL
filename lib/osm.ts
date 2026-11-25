import type { CategoryId } from "./types";

export interface OsmTags {
  [key: string]: string | undefined;
}

/**
 * Maps OSM tags into the map's categories. Named places are preferred; artworks
 * without a name still import, labelled as "Street artwork".
 */
export function mapOsmTagsToCategory(tags: OsmTags): CategoryId | null {
  const artworkType = (tags.artwork_type ?? "").toLowerCase();
  if (tags.tourism === "artwork" && ["mural", "street_art", "graffiti"].includes(artworkType)) {
    return "street-art";
  }
  const craft = (tags.craft ?? "").toLowerCase();
  if (craft && ["photographer", "photo_studio"].includes(craft)) return "photography";
  if (craft && ["artist", "sculptor", "painter", "art_studio"].includes(craft)) return "art-studios";
  if (craft && ["tailor", "dressmaker", "fashion", "clothes"].includes(craft)) return "fashion";
  if (craft) return "creative-spaces";

  if (tags.tourism === "gallery") return "galleries";
  if (tags.amenity === "arts_centre") return "creative-spaces";
  if (tags.amenity === "music_venue") return "music-venues";
  if (tags.amenity === "nightclub" && (tags.music ?? "") !== "no") return "music-venues";
  if (tags.amenity === "studio") {
    if ((tags.studio ?? "").toLowerCase().includes("photo")) return "photography";
    return "creative-spaces";
  }
  if (tags.shop === "boutique") return "fashion";
  if (tags.shop === "clothes") return "fashion";
  if (tags.shop === "art" || tags.shop === "frame") return "galleries";
  return null;
}

export function osmSubcategory(tags: OsmTags): string | null {
  return (
    tags.artwork_type ??
    tags.craft ??
    tags.amenity ??
    tags.tourism ??
    tags.shop ??
    null
  );
}

export function osmName(tags: OsmTags): string {
  return (
    tags.name ??
    tags["name:en"] ??
    (mapOsmTagsToCategory(tags) === "street-art" ? "Street artwork (unnamed)" : "Unnamed creative place")
  );
}

export function osmAddress(tags: OsmTags): string | null {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"] ?? tags["addr:city"],
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}
