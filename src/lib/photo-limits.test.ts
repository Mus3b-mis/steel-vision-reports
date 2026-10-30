import { describe, expect, it } from "vitest";
import { canAnalyzePhotos, remainingPhotoSlots } from "./photo-limits";

describe("inspection photo limits", () => {
  it("requires at least one photo", () => {
    expect(canAnalyzePhotos(0)).toBe(false);
    expect(canAnalyzePhotos(1)).toBe(true);
  });

  it("allows at most 20 photos", () => {
    expect(canAnalyzePhotos(20)).toBe(true);
    expect(canAnalyzePhotos(21)).toBe(false);
    expect(remainingPhotoSlots(18)).toBe(2);
    expect(remainingPhotoSlots(20)).toBe(0);
  });
});
