import { describe, it, expect } from "vitest";
import { isSignificantChange } from "./damage-delta";
const c = (type: "new" | "worsened" | "resolved", severity: "low" | "high") => ({ title: "", detail: "", type, severity });
describe("isSignificantChange", () => {
  it("flags a new high-severity damage", () => expect(isSignificantChange([c("new", "high")], 80, 78)).toBe(true));
  it("flags a 15-point health drop", () => expect(isSignificantChange([], 90, 75)).toBe(true));
  it("ignores small low-severity changes", () => expect(isSignificantChange([c("new", "low")], 90, 85)).toBe(false));
  it("ignores resolved high-severity items", () => expect(isSignificantChange([c("resolved", "high")], 70, 80)).toBe(false));
});
