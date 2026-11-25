import type { CategoryId } from "./types";

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  shortLabel: string;
  color: string;
  /** CSS colour used for heat and glows */
  glow: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "fashion",
    label: "Independent fashion brands",
    shortLabel: "Fashion",
    color: "#FF7EB6",
    glow: "rgba(255,126,182,0.45)",
  },
  {
    id: "art-studios",
    label: "Art studios",
    shortLabel: "Art studios",
    color: "#8AA4FF",
    glow: "rgba(138,164,255,0.45)",
  },
  {
    id: "photography",
    label: "Photography communities",
    shortLabel: "Photography",
    color: "#5FE0CE",
    glow: "rgba(95,224,206,0.45)",
  },
  {
    id: "music-venues",
    label: "Music venues",
    shortLabel: "Music",
    color: "#BE9CFF",
    glow: "rgba(190,156,255,0.45)",
  },
  {
    id: "creative-spaces",
    label: "Creative spaces",
    shortLabel: "Creative spaces",
    color: "#FFB268",
    glow: "rgba(255,178,104,0.45)",
  },
  {
    id: "galleries",
    label: "Galleries",
    shortLabel: "Galleries",
    color: "#B7E39B",
    glow: "rgba(183,227,155,0.45)",
  },
  {
    id: "street-art",
    label: "Street art",
    shortLabel: "Street art",
    color: "#FF6A4D",
    glow: "rgba(255,106,77,0.45)",
  },
];

export const CATEGORY_MAP: Record<CategoryId, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category]),
) as Record<CategoryId, CategoryMeta>;

export function isCategoryId(value: string): value is CategoryId {
  return Object.prototype.hasOwnProperty.call(CATEGORY_MAP, value);
}

export function categoryColor(id: string): string {
  return isCategoryId(id) ? CATEGORY_MAP[id].color : "#C9D2DA";
}

export function categoryLabel(id: string): string {
  return isCategoryId(id) ? CATEGORY_MAP[id].label : "Creative place";
}
