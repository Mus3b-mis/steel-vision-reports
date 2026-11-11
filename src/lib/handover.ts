export const INSPECTION_KINDS = ["periodic", "checkout", "checkin"] as const;
export type InspectionKind = (typeof INSPECTION_KINDS)[number];
export const KIND_LABELS: Record<InspectionKind, string> = {
  periodic: "فحص دوري",
  checkout: "تسليم (خروج)",
  checkin: "استلام (رجوع)",
};
export const FUEL_LEVELS = [0, 25, 50, 75, 100] as const;
export const FUEL_LABELS: Record<number, string> = { 0: "فارغ", 25: "ربع", 50: "نصف", 75: "¾", 100: "ممتلئ" };

/** Distance driven between a checkout and the following checkin (null if unknown or negative). */
export function tripDistance(checkoutOdo: number | null, checkinOdo: number | null): number | null {
  if (checkoutOdo == null || checkinOdo == null) return null;
  const d = checkinOdo - checkoutOdo;
  return d >= 0 ? d : null;
}
