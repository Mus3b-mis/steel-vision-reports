export const INSPECTION_KINDS = ["periodic", "checkout", "checkin"] as const;
export type InspectionKind = (typeof INSPECTION_KINDS)[number];
export const KIND_LABELS: Record<InspectionKind, string> = {
  periodic: "فحص دوري",
  checkout: "تسليم (خروج)",
  checkin: "استلام (رجوع)",
};
export const FUEL_LEVELS = [0, 25, 50, 75, 100] as const;
export const FUEL_LABELS: Record<number, string> = { 0: "فارغ", 25: "ربع", 50: "نصف", 75: "¾", 100: "ممتلئ" };

export type HandoverRecord = {
  assetId: string;
  assetName: string;
  kind: InspectionKind;
  approvalStatus: "pending" | "approved";
  createdAt: string;
  driver: string;
  odometer: number | null;
};

/** The approved checkout that is still open, after any later approved checkin closes it. */
export function activeCheckoutForAsset<T extends HandoverRecord>(
  inspections: T[],
  assetId: string,
  assetName: string,
): T | null {
  const latest = inspections
    .filter(
      (i) =>
        i.approvalStatus === "approved" &&
        (i.kind === "checkout" || i.kind === "checkin") &&
        (i.assetId === assetId || i.assetName === assetName),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return latest?.kind === "checkout" ? latest : null;
}

/** Checkin is only valid for a selected vehicle with an open approved checkout. */
export function canCheckInVehicle(
  asset: { assetType: "vehicle" | "equipment" } | null | undefined,
  activeCheckout: HandoverRecord | null,
): boolean {
  return asset?.assetType === "vehicle" && activeCheckout !== null;
}

/** Distance driven between a checkout and the following checkin (null if unknown or negative). */
export function tripDistance(checkoutOdo: number | null, checkinOdo: number | null): number | null {
  if (checkoutOdo == null || checkinOdo == null) return null;
  const d = checkinOdo - checkoutOdo;
  return d >= 0 ? d : null;
}
