import {
  complianceLabels,
  resultLabels,
  statusLabels,
  type AssetStatus,
  type ComplianceState,
  type Inspection,
} from "@/lib/demo-data";

const tone = {
  good: "bg-success/15 text-success border-success/30",
  warn: "bg-warning/15 text-warning border-warning/30",
  bad: "bg-destructive/15 text-destructive border-destructive/30",
  neutral: "bg-secondary/60 text-muted-foreground border-border",
} as const;

function Pill({ label, kind }: { label: string; kind: keyof typeof tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tone[kind]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const kind = status === "operational" ? "good" : status === "needs_attention" ? "warn" : "bad";
  return <Pill label={statusLabels[status]} kind={kind} />;
}

export function ComplianceBadge({ state }: { state: ComplianceState }) {
  const kind = state === "compliant" ? "good" : state === "due_soon" ? "warn" : "bad";
  return <Pill label={complianceLabels[state]} kind={kind} />;
}

export function ResultBadge({ result }: { result: Inspection["result"] }) {
  const kind = result === "pass" ? "good" : result === "conditional" ? "warn" : "bad";
  return <Pill label={resultLabels[result]} kind={kind} />;
}

export function SeverityBadge({ severity }: { severity: "low" | "medium" | "high" }) {
  const label = severity === "low" ? "منخفضة" : severity === "medium" ? "متوسطة" : "عالية";
  const kind = severity === "low" ? "good" : severity === "medium" ? "warn" : "bad";
  return <Pill label={label} kind={kind} />;
}
