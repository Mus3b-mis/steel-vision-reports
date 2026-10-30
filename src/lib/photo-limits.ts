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

/** Downscale a camera photo to a JPEG data URL so 20 photos stay small enough to send. */
export async function compressPhoto(file: File, maxSide = 1600, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
