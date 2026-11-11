import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAX_INSPECTION_PHOTOS, MIN_INSPECTION_PHOTOS } from "@/lib/photo-limits";

const InspectInput = z.object({
  imageDataUrls: z
    .array(z.string().min(32).startsWith("data:image/"))
    .min(MIN_INSPECTION_PHOTOS)
    .max(MAX_INSPECTION_PHOTOS),
  assetName: z.string().optional(),
  notes: z.string().max(1000).optional(),
  isVehicle: z.boolean().optional(),
  previous: z.object({ date: z.string().max(20), healthScore: z.number().nullable(), findings: z.string().max(4000) }).optional(),
});

export const VEHICLE_AREAS = ["body", "tires", "brakes", "engine", "electrical", "fluids"] as const;
export const AREA_LABELS: Record<(typeof VEHICLE_AREAS)[number], string> = {
  body: "الهيكل والبودي", tires: "الإطارات", brakes: "الفرامل",
  engine: "المحرك", electrical: "الكهرباء والإضاءة", fluids: "السوائل والزيوت",
};

export type AiInspectionReport = {
  assetGuess: string;
  category: string;
  condition: "operational" | "needs_attention" | "out_of_service";
  healthScore: number;
  severity: "low" | "medium" | "high";
  summary: string;
  findings: { title: string; detail: string; severity: "low" | "medium" | "high" }[];
  recommendations: string[];
  suggestedResult: "pass" | "conditional" | "fail";
  changes: import("@/lib/damage-delta").DamageChange[];
  previousHealthScore?: number | null;
  checklist: { area: (typeof VEHICLE_AREAS)[number]; status: "ok" | "attention" | "fail" | "not_visible"; note: string }[];
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "assetGuess",
    "category",
    "condition",
    "healthScore",
    "severity",
    "summary",
    "findings",
    "recommendations",
    "suggestedResult",
    "checklist",
    "changes",
  ],
  properties: {
    assetGuess: { type: "string" },
    category: { type: "string" },
    condition: { type: "string", enum: ["operational", "needs_attention", "out_of_service"] },
    healthScore: { type: "number" },
    severity: { type: "string", enum: ["low", "medium", "high"] },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "severity"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
    recommendations: { type: "array", items: { type: "string" } },
    suggestedResult: { type: "string", enum: ["pass", "conditional", "fail"] },
    changes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "severity", "type"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          type: { type: "string", enum: ["new", "worsened", "resolved", "unchanged"] },
        },
      },
    },
    checklist: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["area", "status", "note"],
        properties: {
          area: { type: "string", enum: [...VEHICLE_AREAS] },
          status: { type: "string", enum: ["ok", "attention", "fail", "not_visible"] },
          note: { type: "string" },
        },
      },
    },
  },
} as const;

export const analyzeAssetImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InspectInput.parse(input))
  .handler(async ({ data }): Promise<AiInspectionReport> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("خدمة الذكاء الاصطناعي غير مهيأة");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        instructions:
          "أنت مفتش مركبات وأساطيل معتمد (وتفحص المعدات الثقيلة أيضًا). قد تصلك عدة صور لنفس الأصل من زوايا مختلفة (الهيكل، الإطارات، المحرك، العداد، الأضرار...)؛ ادمج ما تراه في كل الصور في تقرير واحد موحد، واذكر رقم الصورة في الملاحظة عند الإشارة إلى عيب محدد (مثل: صورة 3). للمركبات املأ checklist بستة بنود بالضبط: body, tires, brakes, engine, electrical, fluids، واستخدم not_visible لما لا يظهر في أي صورة. للمعدات الثقيلة أعد checklist فارغة. حدد الحالة الفنية والمخاطر. اكتب كل النصوص باللغة العربية الفصحى المهنية. كن محافظًا: إذا كانت الصور غير واضحة اذكر ذلك في الملخص واخفض درجة الثقة في التقييم. healthScore رقم من 0 إلى 100.",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `حلّل حالة هذا الأصل من ${data.imageDataUrls.length} صورة وأعد تقرير فحص منظم بصيغة json.${
                  data.assetName ? `\nاسم الأصل المعلن: ${data.assetName}` : ""
                }${data.isVehicle === false ? "\nنوع الأصل: معدة ثقيلة" : "\nنوع الأصل: مركبة"}${data.notes ? `\nملاحظات المفتش: ${data.notes}` : ""}${data.previous ? `\n\nآخر فحص معتمد لنفس الأصل بتاريخ ${data.previous.date} (درجة الصحة ${data.previous.healthScore ?? "غير معروفة"}):\n${data.previous.findings}\n\nقارن الحالة الحالية بهذا الفحص واملأ changes: كل ضرر جديد (new)، أو ملاحظة تفاقمت (worsened)، أو تم إصلاحها (resolved). لا تضف بنود unchanged إلا للملاحظات المهمة.` : "\n\nلا يوجد فحص سابق؛ أعد changes فارغة."}`,
              },
              ...data.imageDataUrls.flatMap((url, i) => [
                { type: "input_text", text: `صورة ${i + 1}:` },
                { type: "input_image", image_url: url },
              ]),
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "inspection_report",
            strict: true,
            schema,
          },
        },
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      throw new Error(`فشل تحليل الصورة (${res.status}): ${body.slice(0, 300)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload) as {
              type?: string;
              delta?: string;
              response?: { output_text?: string };
            };
            if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
              text += evt.delta;
            } else if (evt.type === "response.completed" && evt.response?.output_text) {
              if (!text) text = evt.response.output_text;
            }
          } catch {
            /* ignore partial frame */
          }
        }
      }
    }

    if (!text.trim()) throw new Error("لم يتمكن النظام من قراءة الصورة، حاول بصورة أوضح");

    const report = JSON.parse(text) as AiInspectionReport;
    report.previousHealthScore = data.previous?.healthScore ?? null;
    if (!data.previous) report.changes = [];
    return report;
  });
