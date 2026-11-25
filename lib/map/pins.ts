export const PIN_CSS_WIDTH = 48;
export const PIN_CSS_HEIGHT = 62;
const SCALE = 2;

export function pinImageId(category: string) {
  return `pin-${category}`;
}

export function thumbImageId(id: string) {
  return `thumb-${id}`;
}

/** Glowing pin, drawn at 2x for crisp rendering on retina screens. */
export function createPinImage(color: string, glow = 1): HTMLCanvasElement {
  const width = PIN_CSS_WIDTH;
  const height = PIN_CSS_HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.scale(SCALE, SCALE);
  const cx = width / 2;
  const cy = 24;

  // Soft halo
  const halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, 24);
  halo.addColorStop(0, hexAlpha(color, 0.42 * glow));
  halo.addColorStop(0.55, hexAlpha(color, 0.16 * glow));
  halo.addColorStop(1, hexAlpha(color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.beginPath();
  ctx.moveTo(cx - 7.5, cy + 9);
  ctx.quadraticCurveTo(cx, height - 6, cx, height - 3);
  ctx.quadraticCurveTo(cx, height - 6, cx + 7.5, cy + 9);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.shadowColor = hexAlpha(color, 0.9 * glow);
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(8,10,14,0.9)";
  ctx.fill();

  return canvas;
}

/** Square photo pin used by street-art markers. */
export function createThumbImage(color: string, image?: HTMLImageElement | null): HTMLCanvasElement {
  const size = 56;
  const canvas = document.createElement("canvas");
  canvas.width = size * SCALE;
  canvas.height = size * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(SCALE, SCALE);

  const radius = 13;
  ctx.save();
  roundedRect(ctx, 2, 2, size - 4, size - 4, radius);
  ctx.clip();

  if (image && image.naturalWidth > 0) {
    const ratio = Math.max((size - 4) / image.naturalWidth, (size - 4) / image.naturalHeight);
    const w = image.naturalWidth * ratio;
    const h = image.naturalHeight * ratio;
    ctx.drawImage(image, 2 + (size - 4 - w) / 2, 2 + (size - 4 - h) / 2, w, h);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, hexAlpha(color, 0.85));
    gradient.addColorStop(1, "rgba(9,12,17,0.95)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  roundedRect(ctx, 1.5, 1.5, size - 3, size - 3, radius);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.stroke();
  ctx.restore();

  // Small category tick at the bottom, so the photo pin still reads as a category.
  ctx.beginPath();
  ctx.arc(size / 2, size - 5.5, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  return canvas;
}

export function loadImageElement(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function hexAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
