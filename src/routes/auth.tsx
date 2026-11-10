import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "تسجيل الدخول | وثيق" },
      { name: "description", content: "سجّل الدخول أو أنشئ حساب شركتك في منصة وثيق لفحص الأصول والمعدات." },
      { property: "og:title", content: "تسجيل الدخول | وثيق" },
      { property: "og:description", content: "سجّل الدخول أو أنشئ حساب شركتك في منصة وثيق." },
    ],
  }),
  component: AuthPage,
});

const input =
  "mt-1.5 h-11 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [companyMode, setCompanyMode] = useState<"create" | "join">("create");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [f, setF] = useState({ email: "", password: "", fullName: "", jobTitle: "", company: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: f.email,
          password: f.password,
          options: {
            emailRedirectTo: window.location.origin + "/auth",
            data: { full_name: f.fullName, job_title: f.jobTitle, company: companyMode === "create" ? f.company : "", join_code: companyMode === "join" ? joinCode.trim().toUpperCase() : "" },
          },
        });
        if (error) throw error;
        if (!data.session) setSent("أرسلنا رابط تأكيد إلى بريدك. افتحه لتفعيل حسابك ثم سجّل الدخول.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        setSent("إذا كان البريد مسجلًا فستصلك رسالة لإعادة تعيين كلمة المرور.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg.includes("Invalid login")
          ? "البريد أو كلمة المرور غير صحيحة"
          : msg.includes("already registered")
            ? "هذا البريد مسجل مسبقًا"
            : msg.includes("Email not confirmed")
              ? "يرجى تأكيد بريدك أولًا"
              : msg || "حدث خطأ، حاول مرة أخرى",
      );
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) toast.error("تعذّر تسجيل الدخول عبر Google");
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="frost brushed w-full max-w-md rounded-2xl p-7">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl border border-border bg-primary/15 font-display text-lg font-black text-primary">و</div>
          <span className="font-display text-xl font-extrabold text-gradient-steel">وثيق</span>
        </Link>
        <h1 className="mt-6 text-xl font-bold">
          {mode === "signin" ? "تسجيل الدخول" : mode === "signup" ? "إنشاء حساب" : "استعادة كلمة المرور"}
        </h1>

        {sent ? (
          <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-4 text-sm leading-relaxed">
            {sent}
            <Button variant="link" onClick={() => { setSent(null); setMode("signin"); }} className="mt-3 block">
              العودة لتسجيل الدخول
            </Button>
          </div>
        ) : (
          <>
            {mode !== "forgot" ? (
              <>
                <Button variant="outline" onClick={google} type="button" className="mt-5 flex h-11 w-full items-center justify-center gap-2 bg-secondary/40 text-sm font-medium hover:bg-secondary">
                  المتابعة بحساب Google
                </Button>
                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> أو بالبريد <span className="h-px flex-1 bg-border" />
                </div>
              </>
            ) : null}
            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={companyMode === "create" ? "default" : "outline"} onClick={() => setCompanyMode("create")}>إنشاء شركة</Button>
                    <Button type="button" variant={companyMode === "join" ? "default" : "outline"} onClick={() => setCompanyMode("join")}>الانضمام لشركة</Button>
                  </div>
                  <label className="block text-xs text-muted-foreground">الاسم الكامل<input required value={f.fullName} onChange={set("fullName")} className={input} /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs text-muted-foreground">المسمى الوظيفي<input value={f.jobTitle} onChange={set("jobTitle")} className={input} /></label>
                    {companyMode === "create" ? <label className="block text-xs text-muted-foreground">اسم الشركة<input required maxLength={120} value={f.company} onChange={set("company")} className={input} /></label> : <label className="block text-xs text-muted-foreground">كود الشركة<input required dir="ltr" maxLength={30} value={joinCode} onChange={e => setJoinCode(e.target.value)} className={input} /></label>}
                  </div>
                </>
              ) : null}
              <label className="block text-xs text-muted-foreground">البريد الإلكتروني<input required type="email" dir="ltr" value={f.email} onChange={set("email")} className={input} /></label>
              {mode !== "forgot" ? (
                <label className="block text-xs text-muted-foreground">كلمة المرور<input required type="password" minLength={8} dir="ltr" value={f.password} onChange={set("password")} className={input} /></label>
              ) : null}
              <Button type="submit" disabled={loading} className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === "signin" ? "دخول" : mode === "signup" ? "إنشاء الحساب" : "إرسال رابط الاستعادة"}
              </Button>
            </form>
            <div className="mt-5 flex flex-wrap justify-between gap-2 text-xs">
              {mode === "signin" ? (
                <>
                  <Button variant="link" onClick={() => setMode("signup")} className="px-0">ليس لديك حساب؟ أنشئ حسابًا</Button>
                  <Button variant="link" onClick={() => setMode("forgot")} className="px-0 text-muted-foreground">نسيت كلمة المرور؟</Button>
                </>
              ) : (
                <Button variant="link" onClick={() => setMode("signin")} className="px-0">لديك حساب؟ سجّل الدخول</Button>
              )}
            </div>
            {mode === "signup" ? (
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                إذا دعاك زميل إلى فريقه، سجّل بنفس البريد المدعو وستنضم لشركته تلقائيًا.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
