import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Clock, AlertTriangle } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ComplianceBadge } from "@/components/StatusBadge";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orgDataQuery } from "@/lib/org-data";
import type { ComplianceState } from "@/lib/demo-data";

export const Route = createFileRoute("/_authenticated/compliance")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "حالة الامتثال | وثيق" },
      {
        name: "description",
        content: "متابعة امتثال الأصول لمتطلبات الفحص الدوري وتحديد المتأخرات حسب الموقع.",
      },
      { property: "og:title", content: "حالة الامتثال | وثيق" },
      {
        property: "og:description",
        content: "متابعة امتثال الأصول لمتطلبات الفحص الدوري وتحديد المتأخرات حسب الموقع.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(orgDataQuery),
  component: CompliancePage,
});

const order: ComplianceState[] = ["overdue", "due_soon", "compliant"];

function CompliancePage() {
  const { assets, sites, stats } = useSuspenseQuery(orgDataQuery).data;
  const rate = stats.complianceRate;

  return (
    <AppShell
      title="حالة الامتثال"
      subtitle="مؤشرات الالتزام بمواعيد الفحص الدوري ومتطلبات السلامة."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          icon={ShieldCheck}
          tone="text-success"
          label="أصول مطابقة"
          value={stats.compliant}
          note={`نسبة الامتثال العامة ${rate}%`}
        />
        <Card
          icon={Clock}
          tone="text-warning"
          label="قريبة الاستحقاق"
          value={stats.dueSoon}
          note="يلزم جدولة الفحص خلال 30 يومًا"
        />
        <Card
          icon={AlertTriangle}
          tone="text-destructive"
          label="متأخرة"
          value={stats.overdue}
          note="مخالفة لمتطلبات الفحص الدوري"
        />
      </div>

      <section className="frost rounded-2xl p-5">
        <h2 className="mb-4 text-base font-bold">الامتثال حسب الموقع</h2>
        <ul className="space-y-4">
          {sites.map((site) => {
            const siteAssets = assets.filter((a) => a.site === site);
            const compliant = siteAssets.filter((a) => a.compliance === "compliant").length;
            const pct = siteAssets.length ? Math.round((compliant / siteAssets.length) * 100) : 0;
            return (
              <li key={site}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{site}</span>
                  <span className="text-muted-foreground">
                    {compliant} من {siteAssets.length} · {pct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full ${
                      pct >= 75 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-destructive"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="frost overflow-hidden rounded-2xl">
        <div className="border-b border-border p-5">
          <h2 className="text-base font-bold">قائمة المتابعة التنظيمية</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            مرتبة حسب الأولوية: المتأخر أولًا ثم قريب الاستحقاق.
          </p>
        </div>
        <ul className="divide-y divide-border">
          {[...assets]
            .sort(
              (a, b) =>
                order.indexOf(a.compliance) - order.indexOf(b.compliance) ||
                a.nextInspection.localeCompare(b.nextInspection),
            )
            .map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 p-5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{a.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.id} · {a.site}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  الاستحقاق <span className="text-foreground">{a.nextInspection}</span>
                </div>
                <ComplianceBadge state={a.compliance} />
              </li>
            ))}
        </ul>
      </section>
    </AppShell>
  );
}

function Card({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: number;
  note: string;
  tone: string;
}) {
  return (
    <div className="frost frost-hover rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`size-5 ${tone}`} />
      </div>
      <div className="mt-3 font-display text-3xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </div>
  );
}
