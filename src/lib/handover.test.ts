import { describe, it, expect } from "vitest";
import { tripDistance } from "./handover";
describe("tripDistance", () => {
  it("subtracts checkout from checkin odometer", () => expect(tripDistance(1000, 1250)).toBe(250));
  it("rejects a lower checkin reading", () => expect(tripDistance(1000, 900)).toBeNull());
  it("is unknown without readings", () => expect(tripDistance(null, 900)).toBeNull());
});
