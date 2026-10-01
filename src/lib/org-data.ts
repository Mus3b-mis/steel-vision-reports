import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Asset, AssetStatus, ComplianceState, Inspection } from "@/lib/demo-data";

export type OrgAsset = Asset & { uuid: string };
export type OrgInspection = Inspection & { uuid: string };

const DAY = 86_400_000;

export function complianceFor(next: string | null): ComplianceState {
  if (!next) return "overdue";
  const diff = (new Date(next).getTime() - Date.now()) / DAY;
  if (diff < 0) return "overdue";
  if (diff <= 30) return "due_soon";
  return "compliant";
}

const monthFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { month: "long" });

async function fetchOrgData() {
  const [a, i] = await Promise.all([
    supabase.from("assets").select("*").order("next_inspection", { ascending: true }),
    supabase.from("inspections").select("*").order("inspected_on", { ascending: false }).limit(500),
  ]);
  if (a.error) throw a.error;
  if (i.error) throw i.error;

  const codeById = new Map(a.data.map((r) => [r.id, r.code]));

  const assets: OrgAsset[] = a.data.map((r) => ({
    uuid: r.id,
    id: r.code,
    name: r.name,
    category: r.category,
    site: r.site,
    serial: r.serial,
    status: r.status as AssetStatus,
    compliance: complianceFor(r.next_inspection),
    lastInspection: r.last_inspection ?? "—",
    nextInspection: r.next_inspection ?? "—",
    healthScore: r.health_score,
  }));

  const inspections: OrgInspection[] = i.data.map((r) => ({
    uuid: r.id,
    id: r.code,
    assetId: (r.asset_id && codeById.get(r.asset_id)) || "—",
    assetName: r.asset_name,
    inspector: r.inspector_name,
    date: r.inspected_on,
    result: r.result as Inspection["result"],
    findings: r.findings,
    source: r.source as Inspection["source"],
  }));

  // last 7 months series
  const now = new Date();
  const monthly = Array.from({ length: 7 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 6 + k, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const rows = i.data.filter((r) => r.inspected_on.startsWith(key));
    return {
      month: monthFmt.format(d),
      عدد: rows.length,
      ملاحظات: rows.reduce((s, r) => s + (r.findings_count ?? 0), 0),
    };
  });

  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const total = assets.length;
  const stats = {
    totalAssets: total,
    compliant: assets.filter((x) => x.compliance === "compliant").length,
    dueSoon: assets.filter((x) => x.compliance === "due_soon").length,
    overdue: assets.filter((x) => x.compliance === "overdue").length,
    outOfService: assets.filter((x) => x.status === "out_of_service").length,
    avgHealth: total ? Math.round(assets.reduce((s, x) => s + x.healthScore, 0) / total) : 0,
    inspectionsThisMonth: i.data.filter((r) => r.inspected_on.startsWith(thisMonth)).length,
    complianceRate: 0,
  };
  stats.complianceRate = total ? Math.round((stats.compliant / total) * 100) : 0;

  return {
    assets,
    inspections,
    monthly,
    stats,
    sites: Array.from(new Set(assets.map((x) => x.site).filter(Boolean))),
    categories: Array.from(new Set(assets.map((x) => x.category).filter(Boolean))),
  };
}

export const orgDataQuery = queryOptions({ queryKey: ["org-data"], queryFn: fetchOrgData });

export type Me = {
  userId: string;
  email: string;
  fullName: string;
  jobTitle: string;
  role: "owner" | "admin" | "member";
  orgId: string;
  orgName: string;
  isSuperAdmin: boolean;
};

async function fetchMe(): Promise<Me> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not signed in");
  const [p, m, r] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
    supabase
      .from("organization_members")
      .select("role, organization_id, organizations(name)")
      .eq("user_id", u.user.id)
      .maybeSingle(),
    supabase.rpc("has_role", { _user_id: u.user.id, _role: "super_admin" }),
  ]);
  const org = (m.data?.organizations as { name: string } | null) ?? null;
  return {
    userId: u.user.id,
    email: u.user.email ?? "",
    fullName: p.data?.full_name || u.user.email || "",
    jobTitle: p.data?.job_title ?? "",
    role: (m.data?.role ?? "member") as Me["role"],
    orgId: m.data?.organization_id ?? "",
    orgName: org?.name ?? "",
    isSuperAdmin: !!r.data,
  };
}

export const meQuery = queryOptions({ queryKey: ["me"], queryFn: fetchMe });
