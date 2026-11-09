import { createFileRoute } from "@tanstack/react-router";
import { Images, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { AppShell } from "@/components/AppShell";
import { ResultBadge } from "@/components/StatusBadge";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { companyPermissions } from "@/lib/company-permissions";
import { meQuery, orgDataQuery } from "@/lib/org-data";

export const Route = createFileRoute("/_authenticated/inspections")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  loader: ({ context }) => context.queryClient.ensureQueryData(orgDataQuery),
  component: InspectionsPage,
});

const filters = [
  { key: "all", label: "الكل" },
  { key: "pass", label: "مجتاز" },
  { key: "conditional", label: "بشروط" },
  { key: "fail", label: "غير مجتاز" },
] as const;

function InspectionsPage() {
  const { inspections } = useSuspenseQuery(orgDataQuery).data;
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  async function approve(id: string) {
    setBusy(id);
    const { error } = await supabase.rpc("approve_company_inspection", { _inspection: id });
    setBusy(null);
    if (error) { toast.error("تعذّر اعتماد الفحص"); return; }
    await qc.invalidateQueries({ queryKey: ["org-data"] });
    toast.success("تم اعتماد الفحص وتحديث حالة المركبة");
  }
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
              <div className="flex flex-wrap items-center gap-2"><ResultBadge result={i.result} />
                {i.approvalStatus === "pending" ? <><span className="text-xs text-warning">بانتظار الاعتماد</span>{companyPermissions(me?.role).approveInspections ? <Button size="sm" disabled={busy !== null} onClick={() => approve(i.uuid)}>اعتماد الفحص</Button> : null}</> : null}
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{i.findings}</p>
            {i.photos.length ? <InspectionPhotos paths={i.photos} /> : null}
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

function InspectionPhotos({ paths }: { paths: string[] }) {
  const [open, setOpen] = useState(false);
  const { data: urls = [], isLoading } = useQuery({
    queryKey: ["inspection-photos", paths],
    enabled: open,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("inspection-photos")
        .createSignedUrls(paths, 60 * 60);
      if (error) throw error;
      return data.map((d) => d.signedUrl).filter(Boolean) as string[];
    },
  });

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-secondary/40 px-3 py-1.5 text-xs font-medium hover:bg-secondary"
      >
        <Images className="size-3.5" />
        {open ? "إخفاء الصور" : `عرض الصور (${paths.length})`}
      </button>
      {open ? (
        isLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">جارٍ تحميل الصور…</p>
        ) : (
          <ul className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {urls.map((u, k) => (
              <li key={u} className="aspect-square overflow-hidden rounded-lg border border-border">
                <a href={u} target="_blank" rel="noreferrer">
                  <img src={u} alt={`صورة الفحص ${k + 1}`} className="size-full object-cover" loading="lazy" />
                </a>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
