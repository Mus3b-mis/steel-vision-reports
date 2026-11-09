import { describe, it, expect } from "vitest";
import { companyPermissions } from "./company-permissions";
describe("company hierarchy", () => {
  it("only directors assign roles and rotate codes", () => {
    expect(companyPermissions("owner").assignRoles).toBe(true);
    expect(companyPermissions("owner").rotateCode).toBe(true);
    for (const role of ["admin", "member"] as const) {
      expect(companyPermissions(role).assignRoles).toBe(false);
      expect(companyPermissions(role).rotateCode).toBe(false);
    }
  });
  it("supervisors manage assets and approve, members do not", () => {
    expect(companyPermissions("admin").manageAssets).toBe(true);
    expect(companyPermissions("admin").approveInspections).toBe(true);
    expect(companyPermissions("member").manageAssets).toBe(false);
    expect(companyPermissions("member").approveInspections).toBe(false);
    expect(companyPermissions("member").manageTeam).toBe(false);
  });
  it("supervisors remove members but not other supervisors or directors", () => {
    expect(companyPermissions("admin").removeMember("member", false)).toBe(true);
    expect(companyPermissions("admin").removeMember("admin", false)).toBe(false);
    expect(companyPermissions("owner").removeMember("admin", false)).toBe(true);
    expect(companyPermissions("owner").removeMember("owner", false)).toBe(false);
    expect(companyPermissions("member").removeMember("member", false)).toBe(false);
    expect(companyPermissions("owner").removeMember("member", true)).toBe(false);
  });
});