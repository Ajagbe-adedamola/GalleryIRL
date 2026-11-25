export const CATEGORY_IDS = [
  "fashion",
  "art-studios",
  "photography",
  "music-venues",
  "creative-spaces",
  "galleries",
  "street-art",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export type PlaceStatus = "pending" | "approved" | "rejected";
export type PlaceSource = "community" | "osm" | "curated";

export interface Place {
  id: string;
  slug: string;
  name: string;
  category: CategoryId;
  subcategory: string | null;
  lat: number;
  lng: number;
  neighbourhood: string;
  description: string | null;
  instagram: string | null;
  website: string | null;
  images: string[];
  status: PlaceStatus;
  verified: boolean;
  approximate: boolean;
  source: PlaceSource;
  opening_hours: string | null;
  submitted_by: string | null;
  created_at: string;
  osm_id?: string | null;
}

export interface CreativeRoute {
  id: string;
  title: string;
  description: string | null;
  stop_ids: string[];
}

