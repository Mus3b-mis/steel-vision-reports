import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Boxes,
  ShieldCheck,
  AlertTriangle,
  Activity,
  ClipboardList,
  ScanSearch,
  ArrowLeft,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/AppShell";
import { AssetStatusBadge, ComplianceBadge, ResultBadge } from "@/components/StatusBadge";
import { assets, inspections, monthlyInspections, stats } from "@/lib/demo-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة المعلومات | وثيق" },
      {
        name: "description",
        content: "مؤشرات فورية لحالة الأصول، الفحوصات الشهرية، ونِسَب الامتثال في منصة وثيق.",
      },
      { property: "og:title", content: "لوحة المعلومات | وثيق" },
      {
        property: "og:description",
        content: "مؤشرات فورية لحالة الأصول، الفحوصات الشهرية، ونِسَب الامتثال في منصة وثيق.",
      },
    ],
  }),
  component: Dashboard,
});

const complianceData = [
  { name: "مطابق", value: stats.compliant, fill: "var(--color-chart-2)" },
  { name: "قريب الاستحقاق", value: stats.dueSoon, fill: "var(--color-chart-3)" },
  { name: "متأخر", value: stats.overdue, fill: "var(--color-chart-4)" },
];

function Dashboard() {
  const upcoming = [...assets]
    .sort((a, b) => a.nextInspection.localeCompare(b.nextInspection))
    .slice(0, 5);

  return (
    <AppShell
      title="لوحة المعلومات"
      subtitle="نظرة شاملة على حالة الأصول والفحوصات والامتثال التنظيمي."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Boxes}
          label="إجمالي الأصول المسجلة"
          value={stats.totalAssets}
          hint={`${stats.outOfService} خارج الخدمة`}
        />
        <StatCard
          icon={ShieldCheck}
          label="نسبة الامتثال"
          value={`${Math.round((stats.compliant / stats.totalAssets) * 100)}%`}
          hint={`${stats.compliant} أصل مطابق`}
          tone="good"
        />
        <StatCard
          icon={AlertTriangle}
          label="فحوصات متأخرة"
          value={stats.overdue}
          hint={`${stats.dueSoon} قريبة الاستحقاق`}
          tone="warn"
        />
        <StatCard
          icon={Activity}
          label="متوسط الحالة الفنية"
          value={`${stats.avgHealth}/100`}
          hint={`${stats.inspectionsThisMonth} فحص هذا الشهر`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="frost rounded-2xl p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">الفحوصات والملاحظات شهريًا</h2>
            <span className="text-xs text-muted-foreground">آخر 7 أشهر</span>
          </div>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyInspections} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gInspections" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gFindings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                  stroke="var(--color-border)"
                />
                <YAxis
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                  stroke="var(--color-border)"
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-popover-foreground)",
                    direction: "rtl",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="عدد"
                  stroke="var(--color-chart-1)"
                  fill="url(#gInspections)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="ملاحظات"
                  stroke="var(--color-chart-3)"
                  fill="url(#gFindings)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="frost rounded-2xl p-5">
          <h2 className="mb-4 text-base font-bold">توزيع حالة الامتثال</h2>
          <div className="h-48" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={complianceData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  stroke="var(--color-background)"
                >
                  {complianceData.map((d) => (
                    <Cell key={d.name} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-popover-foreground)",
                    direction: "rtl",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {complianceData.map((d) => (
              <li key={d.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2.5 rounded-full" style={{ background: d.fill }} />
                  {d.name}
                </span>
                <span className="font-semibold">{d.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="frost rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">فحوصات قادمة</h2>
            <Link
              to="/equipment"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              سجل المعدات <ArrowLeft className="size-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {upcoming.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{a.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.id} · {a.site}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <ComplianceBadge state={a.compliance} />
                  <span className="text-[11px] text-muted-foreground">{a.nextInspection}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="frost rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">أحدث الفحوصات</h2>
            <Link
              to="/inspections"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              السجل الكامل <ArrowLeft className="size-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {inspections.slice(0, 5).map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{i.assetName}</div>
                  <div className="text-xs text-muted-foreground">
                    {i.inspector} · {i.date}
                  </div>
                </div>
                <ResultBadge result={i.result} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="frost brushed flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <ScanSearch className="mt-0.5 size-6 text-primary" />
          <div>
            <h2 className="text-base font-bold">الفحص الذكي بالصور</h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              ارفع صورة للأصل ليحللها الذكاء الاصطناعي، ويحدد الحالة والمخاطر ويملأ تقرير الفحص
              تلقائيًا.
            </p>
          </div>
        </div>
        <Link
          to="/ai-inspection"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <ClipboardList className="size-4" />
          ابدأ فحصًا ذكيًا
        </Link>
      </section>

      <section className="frost overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-base font-bold">أصول تحتاج متابعة</h2>
        </div>
        <ul className="divide-y divide-border">
          {assets
            .filter((a) => a.status !== "operational")
            .map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 p-5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{a.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.id} · {a.category} · {a.site}
                  </div>
                </div>
                <AssetStatusBadge status={a.status} />
                <div className="w-32">
                  <div className="mb-1 text-[11px] text-muted-foreground">
                    الحالة الفنية {a.healthScore}%
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${a.healthScore}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
        </ul>
      </section>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof Boxes;
  label: string;
  value: string | number;
  hint: string;
  tone?: "default" | "good" | "warn";
}) {
  const color =
    tone === "good" ? "text-success" : tone === "warn" ? "text-warning" : "text-primary";
  return (
    <div className="frost frost-hover rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`size-5 ${color}`} />
      </div>
      <div className="mt-3 font-display text-3xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
