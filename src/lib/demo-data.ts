export type AssetStatus = "operational" | "needs_attention" | "out_of_service";
export type ComplianceState = "compliant" | "due_soon" | "overdue";

export type Asset = {
  id: string;
  name: string;
  category: string;
  site: string;
  serial: string;
  status: AssetStatus;
  compliance: ComplianceState;
  lastInspection: string;
  nextInspection: string;
  healthScore: number;
};

export type Inspection = {
  id: string;
  assetId: string;
  assetName: string;
  inspector: string;
  date: string;
  result: "pass" | "conditional" | "fail";
  findings: string;
  source: "manual" | "ai";
};

export const statusLabels: Record<AssetStatus, string> = {
  operational: "صالح للعمل",
  needs_attention: "يحتاج متابعة",
  out_of_service: "خارج الخدمة",
};

export const complianceLabels: Record<ComplianceState, string> = {
  compliant: "مطابق",
  due_soon: "قريب الاستحقاق",
  overdue: "متأخر",
};

export const resultLabels: Record<Inspection["result"], string> = {
  pass: "مجتاز",
  conditional: "مجتاز بشروط",
  fail: "غير مجتاز",
};

export const assets: Asset[] = [
  {
    id: "EQ-1042",
    name: "رافعة شوكية ديزل 3 طن",
    category: "معدات مناولة",
    site: "مستودع الرياض الرئيسي",
    serial: "TY-3F-88214",
    status: "operational",
    compliance: "compliant",
    lastInspection: "2026-08-21",
    nextInspection: "2026-11-21",
    healthScore: 92,
  },
  {
    id: "EQ-2098",
    name: "مضخة طرد مركزي خط الإنتاج B",
    category: "معدات دوارة",
    site: "مصنع جدة",
    serial: "GR-PM-4471",
    status: "needs_attention",
    compliance: "due_soon",
    lastInspection: "2026-09-02",
    nextInspection: "2026-09-30",
    healthScore: 68,
  },
  {
    id: "EQ-3310",
    name: "لوحة توزيع كهربائي 400 فولت",
    category: "أنظمة كهربائية",
    site: "مستودع الرياض الرئيسي",
    serial: "SW-400-1129",
    status: "operational",
    compliance: "compliant",
    lastInspection: "2026-07-14",
    nextInspection: "2026-10-14",
    healthScore: 88,
  },
  {
    id: "EQ-4521",
    name: "سقالة معدنية متنقلة 6 م",
    category: "معدات ارتفاعات",
    site: "موقع مشروع الدمام",
    serial: "SC-6M-7742",
    status: "needs_attention",
    compliance: "overdue",
    lastInspection: "2026-05-18",
    nextInspection: "2026-08-18",
    healthScore: 54,
  },
  {
    id: "EQ-5077",
    name: "ضاغط هواء صناعي 75 كيلوواط",
    category: "معدات دوارة",
    site: "مصنع جدة",
    serial: "AC-75-3390",
    status: "operational",
    compliance: "due_soon",
    lastInspection: "2026-08-30",
    nextInspection: "2026-10-05",
    healthScore: 81,
  },
  {
    id: "EQ-6188",
    name: "خزان ضغط بخاري أفقي",
    category: "أوعية ضغط",
    site: "مصنع ينبع",
    serial: "PV-H-5521",
    status: "out_of_service",
    compliance: "overdue",
    lastInspection: "2026-04-09",
    nextInspection: "2026-07-09",
    healthScore: 37,
  },
  {
    id: "EQ-7203",
    name: "حزام ناقل قسم التعبئة",
    category: "خطوط نقل",
    site: "مصنع ينبع",
    serial: "CB-PK-2287",
    status: "operational",
    compliance: "compliant",
    lastInspection: "2026-09-10",
    nextInspection: "2026-12-10",
    healthScore: 95,
  },
  {
    id: "EQ-8145",
    name: "مولد كهربائي احتياطي 500 ك.ف.أ",
    category: "أنظمة كهربائية",
    site: "موقع مشروع الدمام",
    serial: "GN-500-6612",
    status: "needs_attention",
    compliance: "due_soon",
    lastInspection: "2026-08-05",
    nextInspection: "2026-10-01",
    healthScore: 73,
  },
];

export const inspections: Inspection[] = [
  {
    id: "INS-9041",
    assetId: "EQ-7203",
    assetName: "حزام ناقل قسم التعبئة",
    inspector: "م. سارة العتيبي",
    date: "2026-09-10",
    result: "pass",
    findings: "لا توجد ملاحظات جوهرية، تم شد الحزام وتزييت البكرات.",
    source: "manual",
  },
  {
    id: "INS-9038",
    assetId: "EQ-5077",
    assetName: "ضاغط هواء صناعي 75 كيلوواط",
    inspector: "م. عبدالله الحربي",
    date: "2026-08-30",
    result: "conditional",
    findings: "تسريب زيت بسيط من وصلة التصريف، يلزم استبدال الحشوة خلال أسبوعين.",
    source: "ai",
  },
  {
    id: "INS-9031",
    assetId: "EQ-1042",
    assetName: "رافعة شوكية ديزل 3 طن",
    inspector: "م. ريم القحطاني",
    date: "2026-08-21",
    result: "pass",
    findings: "الإطارات والفرامل بحالة جيدة، تم تحديث ملصق الفحص.",
    source: "manual",
  },
  {
    id: "INS-9024",
    assetId: "EQ-8145",
    assetName: "مولد كهربائي احتياطي 500 ك.ف.أ",
    inspector: "م. فهد الدوسري",
    date: "2026-08-05",
    result: "conditional",
    findings: "ارتفاع في حرارة المبادل الحراري تحت الحمل الكامل، يتطلب تنظيف المشعاع.",
    source: "ai",
  },
  {
    id: "INS-9012",
    assetId: "EQ-2098",
    assetName: "مضخة طرد مركزي خط الإنتاج B",
    inspector: "م. سارة العتيبي",
    date: "2026-09-02",
    result: "conditional",
    findings: "اهتزاز زائد عند 1450 دورة، يُرجّح تآكل كرسي التحميل الخلفي.",
    source: "manual",
  },
  {
    id: "INS-8996",
    assetId: "EQ-6188",
    assetName: "خزان ضغط بخاري أفقي",
    inspector: "م. ماجد الشمري",
    date: "2026-04-09",
    result: "fail",
    findings: "صدأ سطحي متقدم حول اللحام العلوي، أوقفت المعدة لحين الفحص بالموجات فوق الصوتية.",
    source: "manual",
  },
  {
    id: "INS-8977",
    assetId: "EQ-4521",
    assetName: "سقالة معدنية متنقلة 6 م",
    inspector: "م. ماجد الشمري",
    date: "2026-05-18",
    result: "conditional",
    findings: "غياب أحد حواجز الأمان الوسطية ووجود انحناء في قائم جانبي.",
    source: "manual",
  },
  {
    id: "INS-8950",
    assetId: "EQ-3310",
    assetName: "لوحة توزيع كهربائي 400 فولت",
    inspector: "م. ريم القحطاني",
    date: "2026-07-14",
    result: "pass",
    findings: "تم التصوير الحراري لجميع القواطع، القراءات داخل النطاق المسموح.",
    source: "manual",
  },
];

export const monthlyInspections = [
  { month: "مارس", عدد: 34, ملاحظات: 9 },
  { month: "أبريل", عدد: 41, ملاحظات: 12 },
  { month: "مايو", عدد: 38, ملاحظات: 7 },
  { month: "يونيو", عدد: 52, ملاحظات: 14 },
  { month: "يوليو", عدد: 47, ملاحظات: 10 },
  { month: "أغسطس", عدد: 61, ملاحظات: 16 },
  { month: "سبتمبر", عدد: 44, ملاحظات: 8 },
];

export const sites = Array.from(new Set(assets.map((a) => a.site)));
export const categories = Array.from(new Set(assets.map((a) => a.category)));

export const stats = {
  totalAssets: assets.length,
  compliant: assets.filter((a) => a.compliance === "compliant").length,
  dueSoon: assets.filter((a) => a.compliance === "due_soon").length,
  overdue: assets.filter((a) => a.compliance === "overdue").length,
  outOfService: assets.filter((a) => a.status === "out_of_service").length,
  avgHealth: Math.round(assets.reduce((s, a) => s + a.healthScore, 0) / assets.length),
  inspectionsThisMonth: 44,
  aiReports: inspections.filter((i) => i.source === "ai").length,
};
