import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
}

export function shareUrl(slug: string): string {
  if (typeof window === "undefined") return `/place/${slug}`;
  return `${window.location.origin}/place/${slug}`;
}

export function normaliseInstagram(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const trimmed = handle.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://instagram.com/${trimmed.replace(/^@/, "")}`;
}

export function normaliseWebsite(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function instagramHandle(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/instagram\.com\/([^/?#]+)/i);
  return match ? `@${match[1]}` : value;
}

export function stripProtocol(value: string): string {
  return value.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}
