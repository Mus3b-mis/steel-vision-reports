import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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

function ResetPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) { toast.error("تعذّر تحديث كلمة المرور، اطلب رابطًا جديدًا"); return; }
    toast.success("تم تحديث كلمة المرور");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="frost w-full max-w-sm space-y-4 rounded-2xl p-7">
        <h1 className="text-xl font-bold">كلمة مرور جديدة</h1>
        <input required type="password" minLength={8} dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="8 أحرف على الأقل" className="h-11 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button disabled={loading} className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">حفظ</button>
      </form>
    </div>
  );
}
