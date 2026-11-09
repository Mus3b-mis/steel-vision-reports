import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, ClipboardList, ScanSearch, ShieldCheck, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "وثيق | منصة سحابية لفحص الأصول والمعدات" },
      { name: "description", content: "سجل معدات، فحوصات دورية، امتثال تنظيمي، وفحص ذكي بالصور لفريقك في منصة واحدة." },
      { property: "og:title", content: "وثيق | منصة سحابية لفحص الأصول والمعدات" },
      { property: "og:description", content: "سجل معدات، فحوصات دورية، امتثال تنظيمي، وفحص ذكي بالصور لفريقك." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Boxes, t: "سجل معدات مركزي", d: "كل أصول شركتك ومواقعها وحالتها الفنية في مكان واحد." },
  { icon: ClipboardList, t: "سجل فحوصات كامل", d: "تاريخ كل فحص ونتيجته والمفتش المسؤول." },
  { icon: ShieldCheck, t: "متابعة الامتثال", d: "تنبيه فوري بالفحوصات المتأخرة وقريبة الاستحقاق." },
  { icon: ScanSearch, t: "فحص ذكي بالكاميرا", d: "التقط صورة وسيولّد الذكاء الاصطناعي تقرير الفحص." },
  { icon: Users, t: "فريق مشترك", d: "ادعُ زملاءك ليعملوا على نفس بيانات الشركة." },
];

function Landing() {
  return (
    <div className="min-h-screen px-5 py-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl border border-border bg-primary/15 font-display text-lg font-black text-primary">و</div>
          <span className="font-display text-xl font-extrabold text-gradient-steel">وثيق</span>
        </div>
        <Link to="/auth" className="rounded-lg border border-input bg-secondary/40 px-4 py-2 text-sm font-medium hover:bg-secondary">تسجيل الدخول</Link>
      </header>
      <section className="mx-auto mt-20 max-w-3xl text-center">
        <h1 className="font-display text-4xl font-black leading-tight sm:text-5xl">
          فحص أصولك ومعداتك <span className="text-gradient-steel">بثقة ووضوح</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          منصة سحابية لفرق السلامة والصيانة: سجّل معداتك، وثّق فحوصاتك، وتابع الامتثال لحظة بلحظة.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth" className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">ابدأ مجانًا</Link>
          <Link to="/dashboard" className="rounded-lg border border-input bg-secondary/40 px-6 py-3 text-sm font-medium hover:bg-secondary">لوحة المعلومات</Link>
        </div>
      </section>
      <section className="mx-auto mt-20 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {features.map((f) => (
          <div key={f.t} className="frost frost-hover rounded-2xl p-5">
            <f.icon className="size-6 text-primary" />
            <h3 className="mt-3 text-sm font-bold">{f.t}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>
      <footer className="mt-20 text-center text-xs text-muted-foreground">وثيق — منصة فحص الأصول والمعدات</footer>
    </div>
  );
}
