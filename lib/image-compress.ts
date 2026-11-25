"use client";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const TARGET_CHARS = 1_100_000; // ≈ 800 KB of base64 payload

export async function compressImage(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Use a JPEG, PNG or WebP image.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("That image is larger than 12 MB. Try a smaller one.");
  }

  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let quality = 0.84;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > TARGET_CHARS && quality > 0.45) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  return dataUrl;
}
