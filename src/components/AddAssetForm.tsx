import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, Plus, Wrench, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/org-data";

const field =
  "mt-1.5 h-10 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

const empty = { name: "", category: "", site: "", serial: "", next: "", plate: "", vin: "", odometer: "", make: "", model: "", year: "" };

export function AddAssetForm() {
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<"vehicle" | "equipment">("vehicle");
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });
  const isVehicle = type === "vehicle";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    const year = f.year ? Number(f.year) : null;
    if (year !== null && (year < 1950 || year > new Date().getFullYear() + 1)) {
      toast.error("سنة الصنع غير صحيحة");
      return;
    }
    const vin = f.vin.trim().toUpperCase();
    if (vin && !/^[A-HJ-NPR-Z0-9]{8,17}$/.test(vin)) {
      toast.error("رقم الهيكل (VIN) غير صحيح");
      return;
    }
    const name = f.name.trim() || [f.make, f.model, f.year].map((x) => x.trim()).filter(Boolean).join(" ");
    if (!name) { toast.error("أدخل اسم الأصل أو الشركة المصنعة والطراز"); return; }
    setBusy(true);
    const { error } = await supabase.from("assets").insert({
      organization_id: me.orgId,
      asset_type: type,
      name: name.slice(0, 120),
      category: f.category.trim() || (isVehicle ? "مركبات" : ""),
      site: f.site.trim(),
      serial: f.serial.trim(),
      next_inspection: f.next || null,
      plate_number: isVehicle ? f.plate.trim().slice(0, 20) : "",
      vin: isVehicle ? vin : "",
      odometer: isVehicle && f.odometer ? Math.max(0, Math.round(Number(f.odometer))) : null,
      make: f.make.trim().slice(0, 60),
      model: f.model.trim().slice(0, 60),
      year,
      created_by: me.userId,
    });
    setBusy(false);
    if (error) { toast.error("تعذّر إضافة الأصل"); return; }
    toast.success(isVehicle ? "تمت إضافة المركبة" : "تمت إضافة المعدة");
    setF(empty);
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["org-data"] });
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        <Plus className="size-4" /> إضافة مركبة / معدة
      </button>
    );

  const tab = (t: typeof type, label: string, Icon: typeof Car) => (
    <button
      type="button"
      onClick={() => setType(t)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
        type === t ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-muted-foreground"
      }`}
    >
      <Icon className="size-3.5" /> {label}
    </button>
  );

  return (
    <form onSubmit={submit} className="frost rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold">أصل جديد</h2>
          <div className="flex gap-1.5">
            {tab("vehicle", "مركبة", Car)}
            {tab("equipment", "معدة ثقيلة", Wrench)}
          </div>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="text-muted-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isVehicle ? (
          <>
            <label className="text-xs text-muted-foreground">رقم اللوحة<input required value={f.plate} onChange={set("plate")} placeholder="أ ب ج 1234" className={field} /></label>
            <label className="text-xs text-muted-foreground">رقم الهيكل (VIN)<input value={f.vin} onChange={set("vin")} dir="ltr" maxLength={17} className={field} /></label>
            <label className="text-xs text-muted-foreground">الشركة المصنعة<input required value={f.make} onChange={set("make")} placeholder="تويوتا" className={field} /></label>
            <label className="text-xs text-muted-foreground">الطراز<input required value={f.model} onChange={set("model")} placeholder="هايلكس" className={field} /></label>
            <label className="text-xs text-muted-foreground">سنة الصنع<input type="number" value={f.year} onChange={set("year")} className={field} /></label>
            <label className="text-xs text-muted-foreground">قراءة العداد (كم)<input type="number" min={0} value={f.odometer} onChange={set("odometer")} className={field} /></label>
            <label className="text-xs text-muted-foreground">اسم مختصر (اختياري)<input value={f.name} onChange={set("name")} className={field} /></label>
          </>
        ) : (
          <>
            <label className="text-xs text-muted-foreground lg:col-span-2">اسم المعدة<input required value={f.name} onChange={set("name")} className={field} /></label>
            <label className="text-xs text-muted-foreground">التصنيف<input value={f.category} onChange={set("category")} className={field} /></label>
            <label className="text-xs text-muted-foreground">الرقم التسلسلي<input value={f.serial} onChange={set("serial")} dir="ltr" className={field} /></label>
          </>
        )}
        <label className="text-xs text-muted-foreground">الموقع / الفرع<input value={f.site} onChange={set("site")} className={field} /></label>
        <label className="text-xs text-muted-foreground">موعد الفحص القادم<input type="date" value={f.next} onChange={set("next")} className={field} /></label>
      </div>
      <button disabled={busy} className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        حفظ
      </button>
    </form>
  );
}
