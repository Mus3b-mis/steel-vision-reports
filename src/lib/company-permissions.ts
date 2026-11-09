export type CompanyRole = "owner" | "admin" | "member";
export const roleLabels = { owner: "مدير", admin: "مسؤول", member: "عضو" } as const;
export function companyPermissions(role: CompanyRole | undefined) {
  return {
    manageAssets: role === "owner" || role === "admin",
    approveInspections: role === "owner" || role === "admin",
    manageTeam: role === "owner" || role === "admin",
    assignRoles: role === "owner",
    rotateCode: role === "owner",
    removeMember: (target: CompanyRole, self: boolean) => !self && target !== "owner" && (role === "owner" || (role === "admin" && target === "member")),
  };
}