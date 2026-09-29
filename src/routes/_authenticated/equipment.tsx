import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { AssetStatusBadge, ComplianceBadge } from "@/components/StatusBadge";
import { assets, categories, sites } from "@/lib/demo-data";

export const Route = createFileRoute("/_authenticated/equipment")({
  head: () => ({
    meta: [
      { title: "سجل المعدات | وثيق" },
      {
        name: "description",
        content: "سجل مركزي لكل الأصول والمعدات مع الموقع والحالة الفنية وتواريخ الفحص القادمة.",
      },
      { property: "og:title", content: "سجل المعدات | وثيق" },
      {
        property: "og:description",
        content: "سجل مركزي لكل الأصول والمعدات مع الموقع والحالة الفنية وتواريخ الفحص القادمة.",
      },
    ],
  }),
  component: EquipmentPage,
});

function EquipmentPage() {
  const [query, setQuery] = useState("");
  const [site, setSite] = useState("all");
  const [category, setCategory] = useState("all");

  const rows = useMemo(
    () =>
      assets.filter(
        (a) =>
          (site === "all" || a.site === site) &&
          (category === "all" || a.category === category) &&
          (query.trim() === "" ||
            `${a.name} ${a.id} ${a.serial}`.toLowerCase().includes(query.trim().toLowerCase())),
      ),
    [query, site, category],
  );

  return (
    <AppShell title="سجل المعدات" subtitle="جميع الأصول المسجلة في المنصة مع حالتها التشغيلية.">
      <div className="frost flex flex-wrap gap-3 rounded-2xl p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث بالاسم أو الرقم التسلسلي"
          className="h-10 min-w-48 flex-1 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={site}
          onChange={(e) => setSite(e.target.value)}
          className="h-10 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">كل المواقع</option>
          {sites.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">كل التصنيفات</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="frost overflow-hidden rounded-2xl">
        <div className="hidden grid-cols-12 gap-3 border-b border-border px-5 py-3 text-xs text-muted-foreground md:grid">
          <div className="col-span-4">الأصل</div>
          <div className="col-span-2">الموقع</div>
          <div className="col-span-2">الحالة</div>
          <div className="col-span-2">الامتثال</div>
          <div className="col-span-2">الفحص القادم</div>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((a) => (
            <li
              key={a.id}
              className="grid gap-2 px-5 py-4 transition-colors hover:bg-secondary/30 md:grid-cols-12 md:items-center md:gap-3"
            >
              <div className="md:col-span-4">
                <div className="text-sm font-semibold">{a.name}</div>
                <div className="text-xs text-muted-foreground">
                  {a.id} · {a.serial} · {a.category}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${a.healthScore}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{a.healthScore}%</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground md:col-span-2">{a.site}</div>
              <div className="md:col-span-2">
                <AssetStatusBadge status={a.status} />
              </div>
              <div className="md:col-span-2">
                <ComplianceBadge state={a.compliance} />
              </div>
              <div className="text-xs md:col-span-2">
                <div>{a.nextInspection}</div>
                <div className="text-muted-foreground">آخر فحص {a.lastInspection}</div>
              </div>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="p-8 text-center text-sm text-muted-foreground">
              لا توجد نتائج مطابقة للبحث.
            </li>
          ) : null}
        </ul>
      </div>
    </AppShell>
  );
}
