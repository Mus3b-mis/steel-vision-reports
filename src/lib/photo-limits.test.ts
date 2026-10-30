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

import { fitWithin } from "./photo-limits";

describe("photo downscaling", () => {
  it("shrinks large phone photos so the longest side is 1280px", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 960, height: 1280 });
  });

  it("never enlarges small photos", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
