import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/org-data";

const field =
  "mt-1.5 h-10 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

export function AddAssetForm() {
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", category: "", site: "", serial: "", next: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setBusy(true);
    const { error } = await supabase.from("assets").insert({
      organization_id: me.orgId,
      name: f.name.trim(),
      category: f.category.trim(),
      site: f.site.trim(),
      serial: f.serial.trim(),
      next_inspection: f.next || null,
      created_by: me.userId,
    });
    setBusy(false);
    if (error) return toast.error("تعذّر إضافة المعدة");
    toast.success("تمت إضافة المعدة");
    setF({ name: "", category: "", site: "", serial: "", next: "" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["org-data"] });
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        <Plus className="size-4" /> إضافة معدة
      </button>
    );

  return (
    <form onSubmit={submit} className="frost rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">معدة جديدة</h2>
        <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="text-muted-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs text-muted-foreground lg:col-span-2">اسم المعدة<input required value={f.name} onChange={set("name")} className={field} /></label>
        <label className="text-xs text-muted-foreground">التصنيف<input value={f.category} onChange={set("category")} className={field} /></label>
        <label className="text-xs text-muted-foreground">الموقع<input value={f.site} onChange={set("site")} className={field} /></label>
        <label className="text-xs text-muted-foreground">الرقم التسلسلي<input value={f.serial} onChange={set("serial")} dir="ltr" className={field} /></label>
        <label className="text-xs text-muted-foreground">موعد الفحص القادم<input type="date" value={f.next} onChange={set("next")} className={field} /></label>
      </div>
      <button disabled={busy} className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        حفظ
      </button>
    </form>
  );
}
