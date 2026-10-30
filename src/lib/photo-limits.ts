/** Each inspection needs at least one photo and allows up to 20. */
export const MIN_INSPECTION_PHOTOS = 1;
export const MAX_INSPECTION_PHOTOS = 20;

/** Returns how many more photos can be added, never below zero. */
export function remainingPhotoSlots(current: number) {
  return Math.max(0, MAX_INSPECTION_PHOTOS - current);
}

export function canAnalyzePhotos(count: number) {
  return count >= MIN_INSPECTION_PHOTOS && count <= MAX_INSPECTION_PHOTOS;
}

/** Longest side of a stored inspection photo, in pixels. */
export const PHOTO_MAX_SIDE = 1280;

/** Size that fits inside maxSide while keeping the aspect ratio (never upscales). */
export function fitWithin(width: number, height: number, maxSide = PHOTO_MAX_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(width, height, 1));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = url;
  });
}

/**
 * Downscale a camera photo to a small JPEG data URL. Uses an <img> element
 * (works on both iOS Safari and Android Chrome/Samsung Internet, respects photo
 * rotation) and frees memory right away so large phone photos don't crash the tab.
 */
export async function compressPhoto(file: File, maxSide = PHOTO_MAX_SIDE, quality = 0.8): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);
    const out = canvas.toDataURL("image/jpeg", quality);
    canvas.width = 0;
    canvas.height = 0;
    img.src = "";
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head = "", b64 = ""] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
