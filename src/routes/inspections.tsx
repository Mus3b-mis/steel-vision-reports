import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, UserRound } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ResultBadge } from "@/components/StatusBadge";
import { inspections } from "@/lib/demo-data";

export const Route = createFileRoute("/inspections")({
  head: () => ({
    meta: [
      { title: "سجل الفحوصات | وثيق" },
      {
        name: "description",
        content: "أرشيف كامل لتقارير الفحص اليدوية وتقارير الذكاء الاصطناعي مع النتائج والملاحظات.",
      },
      { property: "og:title", content: "سجل الفحوصات | وثيق" },
      {
        property: "og:description",
        content: "أرشيف كامل لتقارير الفحص اليدوية وتقارير الذكاء الاصطناعي مع النتائج والملاحظات.",
      },
    ],
  }),
  component: InspectionsPage,
});

const filters = [
  { key: "all", label: "الكل" },
  { key: "pass", label: "مجتاز" },
  { key: "conditional", label: "بشروط" },
  { key: "fail", label: "غير مجتاز" },
] as const;

function InspectionsPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("all");
  const rows = inspections.filter((i) => filter === "all" || i.result === filter);

  return (
    <AppShell title="سجل الفحوصات" subtitle="تاريخ الفحوصات مرتبًا زمنيًا مع نتائج كل تقرير.">
      <div className="frost flex flex-wrap gap-2 rounded-2xl p-3">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3.5 py-2 text-sm transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-secondary/60"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ol className="relative space-y-4 border-s border-border ps-5">
        {rows.map((i) => (
          <li key={i.id} className="frost frost-hover relative rounded-2xl p-5">
            <span className="absolute -start-[1.6rem] top-7 size-2.5 rounded-full bg-primary ring-4 ring-background" />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold">{i.assetName}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {i.id} · {i.assetId} · {i.date}
                </div>
              </div>
              <ResultBadge result={i.result} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{i.findings}</p>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-3.5" />
                {i.inspector}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 ${
                  i.source === "ai" ? "text-primary" : ""
                }`}
              >
                {i.source === "ai" ? <Sparkles className="size-3.5" /> : null}
                {i.source === "ai" ? "تقرير مولّد بالذكاء الاصطناعي" : "فحص ميداني يدوي"}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </AppShell>
  );
}
