import { CHANGE_LABELS, isSignificantChange } from "@/lib/damage-delta";
import { activeCheckoutForAsset, canCheckInVehicle, INSPECTION_KINDS, KIND_LABELS, FUEL_LEVELS, FUEL_LABELS, type InspectionKind } from "@/lib/handover";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Camera, X, CheckCircle2, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { SeverityBadge, ResultBadge, AssetStatusBadge } from "@/components/StatusBadge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, orgDataQuery } from "@/lib/org-data";
import { analyzeAssetImage, AREA_LABELS, type AiInspectionReport } from "@/lib/inspect.functions";
import {
  MAX_INSPECTION_PHOTOS,
  canAnalyzePhotos,
  compressPhoto,
  dataUrlToBlob,
  remainingPhotoSlots,
} from "@/lib/photo-limits";
import { clearDraft, loadDraft, saveDraft } from "@/lib/inspection-draft";
import { companyPermissions } from "@/lib/company-permissions";

export const Route = createFileRoute("/_authenticated/ai-inspection")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const [photos, setPhotos] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [notes, setNotes] = useState("");
  const [odometer, setOdometer] = useState("");
  const [kind, setKind] = useState<InspectionKind>("periodic");
  const [driver, setDriver] = useState("");
  const [fuel, setFuel] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AiInspectionReport | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: org } = useQuery(orgDataQuery);
  const { data: me } = useQuery(meQuery);
  const queryClient = useQueryClient();
  const assets = org?.assets ?? [];
  const matched = assets.find((a) => a.name === assetName.trim() || (a.plate && a.plate === assetName.trim()));
  const isVehicle = matched ? matched.assetType === "vehicle" : true;
  const odo = odometer ? Math.max(0, Math.round(Number(odometer))) : null;
  const slotsLeft = remainingPhotoSlots(photos.length);
  const userId = me?.userId;
  const [draftReady, setDraftReady] = useState(false);

  // Restore the in-progress inspection if the phone reloaded the page while the camera was open.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadDraft(userId).then((draft) => {
      if (cancelled) return;
      if (draft && (draft.photos.length || draft.assetName || draft.notes || draft.odometer)) {
        setPhotos(draft.photos.slice(0, MAX_INSPECTION_PHOTOS));
        setAssetName(draft.assetName ?? "");
        setNotes(draft.notes ?? "");
        setOdometer(draft.odometer ?? "");
        setKind((draft.kind as InspectionKind) ?? "periodic");
        setDriver(draft.driver ?? "");
        setFuel(draft.fuel ?? null);
        setReport((draft.report as AiInspectionReport | null) ?? null);
        if (draft.photos.length) toast.success(`تم استرجاع ${draft.photos.length} صورة من الفحص الجاري`);
      }
      setDraftReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Save every change on the device right away.
  useEffect(() => {
    if (!userId || !draftReady || saved) return;
    void saveDraft(userId, { photos, assetName, notes, odometer, report, kind, driver, fuel });
  }, [userId, draftReady, saved, photos, assetName, notes, odometer, report, kind, driver, fuel]);

  async function startNew() {
    if (photos.length && !saved && !window.confirm("سيتم حذف الصور والبيانات الحالية. متابعة؟")) return;
    setPhotos([]);
    setAssetName("");
    setNotes("");
    setOdometer("");
    setKind("periodic");
    setDriver("");
    setFuel(null);
    setReport(null);
    setSaved(false);
    if (userId) await clearDraft(userId);
  }

  async function approve() {
    if (!report || !me) return;
    if (kind !== "periodic" && !driver.trim()) {
      toast.error("اكتب اسم السائق المستلم أو المسلّم");
      return;
    }
    setSaving(true);
    try {
      const match = matched;
      const today = new Date().toISOString().slice(0, 10);
      const findingsText = [report.summary, ...report.findings.map((f) => `${f.title}: ${f.detail}`)].join("\n");
      const inspectionId = crypto.randomUUID();
      const paths: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const path = `${me.orgId}/${inspectionId}/${i + 1}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("inspection-photos")
          .upload(path, dataUrlToBlob(photos[i] ?? ""), { contentType: "image/jpeg", upsert: true });
        if (upErr) throw upErr;
        paths.push(path);
      }
      const { error } = await supabase.from("inspections").insert({
        id: inspectionId,
        organization_id: me.orgId,
        asset_id: match?.uuid ?? null,
        asset_name: match?.name ?? (assetName.trim() || report.assetGuess),
        inspector_name: me.fullName,
        result: report.suggestedResult,
        findings: findingsText,
        findings_count: report.findings.length,
        source: "ai",
        health_score: Math.round(report.healthScore),
        report: report as never,
        checklist: (report.checklist?.length ? report.checklist : null) as never,
        odometer: odo,
        inspection_kind: kind,
        driver_name: kind === "periodic" ? "" : driver.trim(),
        fuel_level: kind === "periodic" ? null : fuel,
        photos: paths,
        created_by: me.userId,
      });
      if (error) throw error;
      if (match && companyPermissions(me.role).approveInspections) {
        const next = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
        const { error: e2 } = await supabase
          .from("assets")
          .update({
            last_inspection: today,
            next_inspection: next,
            health_score: Math.max(0, Math.min(100, Math.round(report.healthScore))),
            status: report.condition,
            ...(odo !== null ? { odometer: odo } : {}),
          })
          .eq("id", match.uuid);
        if (e2) throw e2;
      }
      await queryClient.invalidateQueries({ queryKey: ["org-data"] });
      setSaved(true);
      await clearDraft(me.userId);
      toast.success(!companyPermissions(me.role).approveInspections ? "تم إرسال الفحص للمسؤول لاعتماده" : match ? "تم اعتماد التقرير وتحديث حالة المعدة" : "تم اعتماد التقرير وإضافته لسجل الفحوصات");
    } catch (err) {
      console.error(err);
      toast.error("تعذّر حفظ التقرير، حاول مرة أخرى");
    } finally {
      setSaving(false);
    }
  }

  async function pickFiles(files: File[]) {
    if (!files.length) return;
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length !== files.length) toast.error("الرجاء التقاط صور فقط");
    const room = remainingPhotoSlots(photos.length);
    if (room === 0) {
      toast.error(`وصلت للحد الأقصى ${MAX_INSPECTION_PHOTOS} صورة`);
      return;
    }
    const batch = images.slice(0, room);
    if (images.length > room) toast.error(`تمت إضافة ${room} فقط — الحد الأقصى ${MAX_INSPECTION_PHOTOS} صورة`);
    setProcessing(true);
    setReport(null);
    setSaved(false);
    try {
      // One photo at a time keeps memory low on phones.
      for (const f of batch) {
        const url = await compressPhoto(f);
        setPhotos((prev) => [...prev, url].slice(0, MAX_INSPECTION_PHOTOS));
      }
    } catch (err) {
      console.error(err);
      toast.error("تعذّرت قراءة الصورة، حاول مرة أخرى");
    } finally {
      setProcessing(false);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setReport(null);
    setSaved(false);
  }

  async function runAnalysis() {
    if (!canAnalyzePhotos(photos.length)) {
      toast.error("التقط صورة واحدة على الأقل");
      return;
    }
    setLoading(true);
    setSaved(false);
    try {
      const result = await analyze({
        data: {
          imageDataUrls: photos,
          assetName: assetName || undefined,
          isVehicle,
          notes: notes || undefined,
          previous: (() => {
            const prev = (org?.inspections ?? []).filter((x) => x.approvalStatus === "approved" && (matched ? x.assetId === matched.id : x.assetName === assetName.trim())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
            return prev && assetName.trim() ? { date: prev.date, healthScore: prev.healthScore, findings: prev.findings.slice(0, 4000) } : undefined;
          })(),
        },
      });
      setReport(result);
      toast.success("تم تحليل الصور وتجهيز التقرير");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "تعذّر تحليل الصور، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="الفحص الذكي بالصور"
      subtitle="التقط من صورة واحدة حتى 20 صورة للأصل، وسيحدد الذكاء الاصطناعي الحالة والمخاطر ويملأ تقرير الفحص."
    >
      <div className="grid gap-4 lg:grid-cols-5">
        <section className="frost rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold">1 · صور الأصل</h2>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                photos.length ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
              }`}
            >
              {photos.length} / {MAX_INSPECTION_PHOTOS}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            صورة واحدة إلزامية، ويمكنك إضافة حتى {MAX_INSPECTION_PHOTOS} صورة من زوايا مختلفة (الهيكل، الإطارات، المحرك، العداد، الأضرار).
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              pickFiles(files);
            }}
          />

          {photos.length ? (
            <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((src, i) => (
                <li key={i} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                  <img src={src} alt={`صورة الأصل ${i + 1}`} className="size-full object-cover" />
                  <span className="absolute start-1 top-1 rounded bg-popover/80 px-1.5 text-[10px] font-semibold text-foreground backdrop-blur">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label={`إزالة الصورة ${i + 1}`}
                    className="absolute end-1 top-1 grid size-6 place-items-center rounded-md border border-border bg-popover/80 text-foreground backdrop-blur"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
              {slotsLeft > 0 ? (
                <li>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={processing || loading}
                    aria-label="التقاط صورة إضافية"
                    className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input bg-secondary/25 text-primary transition-colors hover:border-primary/50 hover:bg-secondary/40 disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />}
                    <span className="text-[10px] text-muted-foreground">إضافة</span>
                  </button>
                </li>
              ) : null}
            </ul>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={processing}
              className="mt-4 flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-input bg-secondary/25 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-secondary/40"
            >
              {processing ? <Loader2 className="size-7 animate-spin text-primary" /> : <Camera className="size-7 text-primary" />}
              <span className="text-sm font-medium">التقاط الصورة الأولى بالكاميرا</span>
              <span className="text-xs text-muted-foreground">
                يُفتح كاميرا الجهاز مباشرة — لا يمكن الاختيار من الملفات أو الاستوديو
              </span>
            </button>
          )}
          {slotsLeft === 0 ? (
            <p className="mt-2 text-xs text-warning">وصلت للحد الأقصى ({MAX_INSPECTION_PHOTOS} صورة).</p>
          ) : null}
          {photos.length ? (
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>الصور محفوظة على جهازك حتى تعتمد التقرير.</span>
              <button
                type="button"
                onClick={startNew}
                disabled={loading || saving || processing}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-input bg-secondary/40 px-2 py-1 font-medium text-foreground hover:bg-secondary disabled:opacity-50"
              >
                <RotateCcw className="size-3" />
                فحص جديد
              </button>
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            <label className="block text-xs text-muted-foreground">
              المركبة أو المعدة (اختر من السجل لربط التقرير بها)
              <input
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                list="asset-names"
                placeholder="مثال: تويوتا هايلكس 2022"
                className="mt-1.5 h-10 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <datalist id="asset-names">
              {assets.map((a) => (
                <option key={a.id} value={a.name}>{a.plate}</option>
              ))}
            </datalist>
            <div className="text-xs text-muted-foreground">
              نوع الفحص
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {INSPECTION_KINDS.map((k) => (
                  <button key={k} type="button" onClick={() => setKind(k)}
                    className={`h-10 rounded-lg border text-sm ${kind === k ? "border-primary bg-primary/15 text-foreground" : "border-input bg-secondary/40"}`}>
                    {KIND_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>
            {kind !== "periodic" ? (
              <>
                <label className="block text-xs text-muted-foreground">
                  {kind === "checkout" ? "اسم السائق المستلم" : "اسم السائق المُعيد"}
                  <input value={driver} onChange={(e) => setDriver(e.target.value)} placeholder="مثال: أحمد علي"
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <div className="text-xs text-muted-foreground">
                  مستوى الوقود
                  <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                    {FUEL_LEVELS.map((f) => (
                      <button key={f} type="button" onClick={() => setFuel(f)}
                        className={`h-9 rounded-lg border text-xs ${fuel === f ? "border-primary bg-primary/15 text-foreground" : "border-input bg-secondary/40"}`}>
                        {FUEL_LABELS[f]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
            {isVehicle ? (
              <label className="block text-xs text-muted-foreground">
                قراءة العداد الحالية (كم)
                <input
                  type="number"
                  min={0}
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder={matched?.odometer != null ? `آخر قراءة ${matched.odometer}` : "مثال: 84500"}
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            ) : null}
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
            disabled={!canAnalyzePhotos(photos.length) || loading || processing}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading
              ? `جارٍ تحليل ${photos.length} صورة…`
              : photos.length > 1
                ? `تحليل ${photos.length} صور وتوليد التقرير`
                : "تحليل الصورة وتوليد التقرير"}
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
              لا يوجد تقرير بعد. التقط صورة واحدة على الأقل ثم اضغط «تحليل».
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

              {report.changes?.length ? (
                <div>
                  <h3 className="text-sm font-bold">مقارنة بالفحص السابق</h3>
                  {isSignificantChange(report.changes, report.previousHealthScore, report.healthScore) ? (
                    <p className="mt-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">تغيّر كبير في حالة المركبة — سيظهر تنبيه للمشرف عند الحفظ.</p>
                  ) : null}
                  <ul className="mt-2 space-y-2">
                    {report.changes.map((c, i) => (
                      <li key={i} className="rounded-xl border border-border bg-secondary/25 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{CHANGE_LABELS[c.type]}: {c.title}</span>
                          <SeverityBadge severity={c.severity} />
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {report.checklist?.length ? (
                <div>
                  <h3 className="text-sm font-bold">قائمة فحص المركبة</h3>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {report.checklist.map((c) => (
                      <li key={c.area} className="rounded-xl border border-border bg-secondary/25 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{AREA_LABELS[c.area] ?? c.area}</span>
                          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            c.status === "ok" ? "bg-success/15 text-success"
                            : c.status === "attention" ? "bg-warning/15 text-warning"
                            : c.status === "fail" ? "bg-destructive/15 text-destructive"
                            : "bg-secondary text-muted-foreground"}`}>
                            {{ ok: "سليم", attention: "يحتاج متابعة", fail: "غير صالح", not_visible: "غير ظاهر" }[c.status]}
                          </span>
                        </div>
                        {c.note ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.note}</p> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

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
                  onClick={approve}
                  disabled={saving || saved}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <CheckCircle2 className="size-4" />
                  {companyPermissions(me?.role).approveInspections ? "اعتماد التقرير" : "إرسال للمراجعة"}
                </button>
                <button
                  onClick={runAnalysis}
                  disabled={loading || saving}
                  className="rounded-lg border border-input bg-secondary/40 px-4 py-2.5 text-sm font-medium hover:bg-secondary"
                >
                  إعادة التحليل
                </button>
                {saved ? (
                  <span className="inline-flex items-center gap-1.5 self-center text-xs text-success">
                    <CheckCircle2 className="size-3.5" /> {companyPermissions(me?.role).approveInspections ? "مُعتمد" : "بانتظار الاعتماد"}
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
