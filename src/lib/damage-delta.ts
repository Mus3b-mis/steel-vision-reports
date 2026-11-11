export type DamageChange = {
  title: string;
  detail: string;
  severity: "low" | "medium" | "high";
  type: "new" | "worsened" | "resolved" | "unchanged";
};

/** Health drop (points) that counts as a big change on its own. */
export const BIG_HEALTH_DROP = 15;

/** A change is significant when a new/worsened issue is high severity, or health dropped by BIG_HEALTH_DROP+. */
export function isSignificantChange(changes: DamageChange[] | undefined, prevHealth: number | null | undefined, health: number | null | undefined): boolean {
  if ((changes ?? []).some((c) => (c.type === "new" || c.type === "worsened") && c.severity === "high")) return true;
  if (prevHealth != null && health != null && prevHealth - health >= BIG_HEALTH_DROP) return true;
  return false;
}

export const CHANGE_LABELS: Record<DamageChange["type"], string> = {
  new: "ضرر جديد",
  worsened: "تفاقم",
  resolved: "تم إصلاحه",
  unchanged: "بدون تغيير",
};
