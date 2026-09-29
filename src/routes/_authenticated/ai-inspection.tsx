import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Camera, X, CheckCircle2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { SeverityBadge, ResultBadge, AssetStatusBadge } from "@/components/StatusBadge";
import { assets } from "@/lib/demo-data";
import { analyzeAssetImage, type AiInspectionReport } from "@/lib/inspect.functions";

export const Route = createFileRoute("/_authenticated/ai-inspection")({
  head: () => ({
    meta: [
      { title: "الفحص الذكي بالصور | وثيق" },
      {
        name: "description",
        content:
          "ارفع صورة للأصل ليحلل الذكاء الاصطناعي حالته الفنية ويملأ تقرير الفحص تلقائيًا في منصة وثيق.",
      },
      { property: "og:title", content: "الفحص الذكي بالصور | وثيق" },
      {
        property: "og:description",
        content: "تحليل صور الأصول بالذكاء الاصطناعي وتوليد تقرير فحص جاهز للاعتماد.",
      },
    ],
  }),
  component: AiInspectionPage,
});

function AiInspectionPage() {
  const analyze = useServerFn(analyzeAssetImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [assetName, setAssetName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AiInspectionReport | null>(null);
  const [saved, setSaved] = useState(false);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("الرجاء اختيار ملف صورة");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("حجم الصورة كبير، الحد الأقصى 8 ميجابايت");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(String(reader.result));
      setReport(null);
      setSaved(false);
    };
    reader.readAsDataURL(file);
  }

  async function runAnalysis() {
    if (!preview) return;
    setLoading(true);
    setSaved(false);
    try {
      const result = await analyze({
        data: {
          imageDataUrl: preview,
          assetName: assetName || undefined,
          notes: notes || undefined,
        },
      });
      setReport(result);
      toast.success("تم تحليل الصورة وتجهيز التقرير");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "تعذّر تحليل الصورة، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="الفحص الذكي بالصور"
      subtitle="ارفع صورة واضحة للأصل، وسيحدد الذكاء الاصطناعي الحالة والمخاطر ويملأ تقرير الفحص."
    >
      <div className="grid gap-4 lg:grid-cols-5">
        <section className="frost rounded-2xl p-5 lg:col-span-2">
          <h2 className="text-base font-bold">1 · صورة الأصل</h2>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              pickFile(file);
            }}
          />

          {preview ? (
            <div className="relative mt-4 overflow-hidden rounded-xl border border-border">
              <img src={preview} alt="صورة الأصل المرفوعة" className="max-h-72 w-full object-cover" />
              <button
                onClick={() => {
                  setPreview(null);
                  setReport(null);
                }}
                aria-label="إزالة الصورة"
                className="absolute end-2 top-2 grid size-8 place-items-center rounded-lg border border-border bg-popover/80 text-foreground backdrop-blur"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-4 flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-input bg-secondary/25 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-secondary/40"
            >
              <Camera className="size-7 text-primary" />
              <span className="text-sm font-medium">التقاط صورة بالكاميرا الآن</span>
              <span className="text-xs text-muted-foreground">
                يُفتح كاميرا الجهاز مباشرة — لا يمكن الاختيار من الملفات أو الاستوديو
              </span>
            </button>
          )}

          <div className="mt-5 space-y-3">
            <label className="block text-xs text-muted-foreground">
              اسم الأصل (اختياري)
              <input
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                list="asset-names"
                placeholder="مثال: ضاغط هواء صناعي 75 كيلوواط"
                className="mt-1.5 h-10 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <datalist id="asset-names">
              {assets.map((a) => (
                <option key={a.id} value={a.name} />
              ))}
            </datalist>
            <label className="block text-xs text-muted-foreground">
              ملاحظات المفتش (اختياري)
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="مثال: صوت غير طبيعي عند التشغيل"
                className="mt-1.5 w-full resize-none rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>

          <button
            onClick={runAnalysis}
            disabled={!preview || loading}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "جارٍ تحليل الصورة…" : "تحليل الصورة وتوليد التقرير"}
          </button>
        </section>

        <section className="frost rounded-2xl p-5 lg:col-span-3">
          <h2 className="text-base font-bold">2 · تقرير الفحص المقترح</h2>

          {loading ? (
            <div className="mt-6 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary/50" />
              ))}
              <p className="pt-2 text-center text-xs text-muted-foreground">
                يقوم النظام بمعاينة الصورة وتقييم الحالة الفنية…
              </p>
            </div>
          ) : !report ? (
            <p className="mt-6 rounded-xl border border-dashed border-input bg-secondary/20 p-8 text-center text-sm text-muted-foreground">
              لا يوجد تقرير بعد. ارفع صورة الأصل ثم اضغط «تحليل الصورة».
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="الأصل المتعرف عليه" value={report.assetGuess} />
                <Field label="التصنيف" value={report.category} />
                <Field label="الحالة الفنية" value={`${report.healthScore}/100`} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <AssetStatusBadge status={report.condition} />
                <ResultBadge result={report.suggestedResult} />
                <SeverityBadge severity={report.severity} />
              </div>

              <div>
                <h3 className="text-sm font-bold">الملخص</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {report.summary}
                </p>
              </div>

              {report.findings.length ? (
                <div>
                  <h3 className="text-sm font-bold">الملاحظات المرصودة</h3>
                  <ul className="mt-2 space-y-2">
                    {report.findings.map((f, i) => (
                      <li key={i} className="rounded-xl border border-border bg-secondary/25 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{f.title}</span>
                          <SeverityBadge severity={f.severity} />
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {f.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {report.recommendations.length ? (
                <div>
                  <h3 className="text-sm font-bold">الإجراءات الموصى بها</h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                    {report.recommendations.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <button
                  onClick={() => {
                    setSaved(true);
                    toast.success("تم اعتماد التقرير وإضافته لسجل الفحوصات (نسخة تجريبية)");
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <CheckCircle2 className="size-4" />
                  اعتماد التقرير
                </button>
                <button
                  onClick={runAnalysis}
                  className="rounded-lg border border-input bg-secondary/40 px-4 py-2.5 text-sm font-medium hover:bg-secondary"
                >
                  إعادة التحليل
                </button>
                {saved ? (
                  <span className="inline-flex items-center gap-1.5 self-center text-xs text-success">
                    <CheckCircle2 className="size-3.5" /> مُعتمد
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/25 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
