import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "تعيين كلمة مرور جديدة | وثيق" },
      { name: "description", content: "عيّن كلمة مرور جديدة لحسابك في منصة وثيق." },
      { property: "og:title", content: "تعيين كلمة مرور جديدة | وثيق" },
      { property: "og:description", content: "عيّن كلمة مرور جديدة لحسابك في منصة وثيق." },
    ],
  }),
  component: ResetPassword,
});

const inputCls =
  "h-11 w-full rounded-lg border border-input bg-secondary/40 pe-10 ps-3 text-sm outline-none focus:ring-2 focus:ring-ring";

function PasswordField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input required type={show ? "text" : "password"} minLength={8} dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute inset-y-0 end-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function ResetPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState<"wait" | "ok" | "none">("wait");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) setReady("ok");
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady("ok");
      else setTimeout(() => setReady((r) => (r === "ok" ? r : "none")), 2500);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) {
      const m = error.message.toLowerCase();
      toast.error(
        m.includes("weak") || m.includes("pwned") || m.includes("easy to guess")
          ? "كلمة المرور ضعيفة أو مسرّبة سابقًا، اختر كلمة أقوى (حروف وأرقام ورموز)"
          : m.includes("same") || m.includes("different from the old")
            ? "كلمة المرور الجديدة يجب أن تختلف عن القديمة"
            : m.includes("session")
              ? "انتهت صلاحية الرابط، اطلب رابطًا جديدًا"
              : error.message,
      );
      return;
    }
    toast.success("تم تحديث كلمة المرور");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="frost w-full max-w-sm rounded-2xl p-7">
        <h1 className="text-xl font-bold">كلمة مرور جديدة</h1>
        {ready === "wait" ? (
          <div className="mt-6 flex justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : ready === "none" ? (
          <div className="mt-4 space-y-4 text-sm text-muted-foreground">
            <p>رابط الاستعادة غير صالح أو انتهت صلاحيته. افتح أحدث رسالة وصلتك، أو اطلب رابطًا جديدًا.</p>
            <Link to="/auth" className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">طلب رابط جديد</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <PasswordField value={pw} onChange={setPw} placeholder="كلمة المرور الجديدة (8 أحرف على الأقل)" />
            <PasswordField value={pw2} onChange={setPw2} placeholder="تأكيد كلمة المرور" />
            {pw2 && pw !== pw2 ? <p className="text-xs text-destructive">كلمتا المرور غير متطابقتين</p> : null}
            <button disabled={loading} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}حفظ كلمة المرور
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
