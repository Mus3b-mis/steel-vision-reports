import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InspectInput = z.object({
  imageDataUrl: z.string().min(32),
  assetName: z.string().optional(),
  notes: z.string().optional(),
});

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
  },
} as const;

export const analyzeAssetImage = createServerFn({ method: "POST" })
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
          "أنت مفتش أصول ومعدات صناعية معتمد. حلّل صورة الأصل وحدد حالته الفنية والمخاطر. اكتب كل النصوص باللغة العربية الفصحى المهنية. كن محافظًا: إذا كانت الصورة غير واضحة اذكر ذلك في الملخص واخفض درجة الثقة في التقييم. healthScore رقم من 0 إلى 100.",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `حلّل حالة هذا الأصل وأعد تقرير فحص منظم بصيغة json.${
                  data.assetName ? `\nاسم الأصل المعلن: ${data.assetName}` : ""
                }${data.notes ? `\nملاحظات المفتش: ${data.notes}` : ""}`,
              },
              { type: "input_image", image_url: data.imageDataUrl },
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

    return JSON.parse(text) as AiInspectionReport;
  });
