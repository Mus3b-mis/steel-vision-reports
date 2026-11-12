import { describe, it, expect } from "vitest";
import { activeCheckoutForAsset, canCheckInVehicle, tripDistance, type HandoverRecord } from "./handover";

function handover(kind: HandoverRecord["kind"], createdAt: string, approvalStatus: HandoverRecord["approvalStatus"] = "approved"): HandoverRecord {
  return { assetId: "V-1", assetName: "تويوتا", kind, approvalStatus, createdAt, driver: "أحمد", odometer: 1000 };
}

describe("vehicle checkin eligibility", () => {
  it("allows checkin after an approved checkout", () => {
    const checkout = activeCheckoutForAsset([handover("checkout", "2026-01-01")], "V-1", "تويوتا");
    expect(canCheckInVehicle({ assetType: "vehicle" }, checkout)).toBe(true);
  });
  it("rejects checkin when the vehicle was never checked out", () => {
    expect(canCheckInVehicle({ assetType: "vehicle" }, null)).toBe(false);
  });
  it("rejects a second checkin after the checkout was closed", () => {
    const rows = [handover("checkin", "2026-01-02"), handover("checkout", "2026-01-01")];
    expect(activeCheckoutForAsset(rows, "V-1", "تويوتا")).toBeNull();
  });
  it("does not treat a pending checkout as a handover", () => {
    expect(activeCheckoutForAsset([handover("checkout", "2026-01-01", "pending")], "V-1", "تويوتا")).toBeNull();
  });
  it("rejects checkin for heavy equipment", () => {
    const checkout = handover("checkout", "2026-01-01");
    expect(canCheckInVehicle({ assetType: "equipment" }, checkout)).toBe(false);
  });
});

describe("tripDistance", () => {
  it("subtracts checkout from checkin odometer", () => expect(tripDistance(1000, 1250)).toBe(250));
  it("rejects a lower checkin reading", () => expect(tripDistance(1000, 900)).toBeNull());
  it("is unknown without readings", () => expect(tripDistance(null, 900)).toBeNull());
});
