import { z } from "zod";
import { CATEGORY_IDS } from "./types";
import { isInsideLagos } from "./geo";

export const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const submissionSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(90),
  category: z.enum(CATEGORY_IDS),
  neighbourhood: z.string().trim().min(2, "Add a neighbourhood").max(60),
  description: z.string().trim().max(900).optional().default(""),
  instagram: z.string().trim().max(200).optional().default(""),
  website: z.string().trim().max(200).optional().default(""),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  approximate: z.boolean().optional().default(false),
  images: z.array(z.string()).max(MAX_IMAGES).optional().default([]),
  /** Honeypot: real users never fill this hidden field. */
  company: z.string().max(0).optional().default(""),
});

export const reportSchema = z.object({
  placeId: z.string().uuid(),
  reason: z.string().trim().min(5, "Tell us what is wrong").max(500),
  company: z.string().max(0).optional().default(""),
});

export interface ParsedImage {
  mime: string;
  bytes: Uint8Array;
  extension: "jpg" | "png" | "webp";
}

const MAGIC: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/webp": (b) =>
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45,
};

export function parseImageDataUrl(dataUrl: string): ParsedImage | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime)) return null;

  let binary: string;
  try {
    binary = atob(match[2]);
  } catch {
    return null;
  }
  if (binary.length > MAX_IMAGE_BYTES) return null;

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  if (bytes.length < 16) return null;
  if (!MAGIC[mime]?.(bytes)) return null;

  return {
    mime,
    bytes,
    extension: mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg",
  };
}

export function submissionLocationError(lat: number, lng: number): string | null {
  if (!isInsideLagos(lat, lng)) {
    return "Choose a location inside the Lagos area before submitting.";
  }
  return null;
}
