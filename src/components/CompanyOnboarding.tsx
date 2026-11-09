import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function CompanyOnboarding() {
  const [mode, setMode] = useState<"create" | "join">("join");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const result = mode === "join"
        ? await supabase.rpc("join_company", { _code: value.trim().toUpperCase() })
        : await supabase.rpc("create_company_account", { _name: value.trim() });
      if (result.error) throw result.error;
      qc.clear();
      await router.invalidate();
      toast.success(mode === "join" ? "تم الانضمام إلى الشركة كعضو" : "تم إنشاء شركتك");
    } catch { toast.error(mode === "join" ? "كود الشركة غير صحيح أو غير متاح" : "تعذّر إنشاء الشركة"); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-5 py-10">
    <h1 className="font-display text-3xl font-bold text-primary">وثيق</h1>
    <h2 className="text-xl font-bold">حساب شركتك</h2>
    <div className="grid grid-cols-2 gap-2">
      <Button variant={mode === "join" ? "default" : "outline"} onClick={() => { setMode("join"); setValue(""); }}><Users /> الانضمام لشركة</Button>
      <Button variant={mode === "create" ? "default" : "outline"} onClick={() => { setMode("create"); setValue(""); }}><Building2 /> إنشاء شركة</Button>
    </div>
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm">{mode === "join" ? "كود الشركة" : "اسم الشركة"}
        <input required maxLength={mode === "join" ? 30 : 120} dir={mode === "join" ? "ltr" : "rtl"} value={value} onChange={e => setValue(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-input bg-secondary/40 px-3" />
      </label>
      <Button disabled={busy} className="w-full" type="submit">{busy ? <Loader2 className="animate-spin" /> : null}{mode === "join" ? "انضمام" : "إنشاء الشركة"}</Button>
    </form>
    <Button variant="ghost" onClick={async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); await router.navigate({ to: "/auth", replace: true }); }}>تسجيل الخروج</Button>
  </main>;
}