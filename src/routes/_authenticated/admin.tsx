import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Building2, CheckCircle2, CreditCard, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "إدارة المنصة | وثيق" },
      { name: "description", content: "لوحة المدير العام لإدارة الشركات والمستخدمين والاشتراكات في منصة وثيق." },
      { property: "og:title", content: "إدارة المنصة | وثيق" },
      { property: "og:description", content: "إدارة الشركات والمستخدمين والاشتراكات." },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "super_admin" });
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

const planLabels: Record<string, string> = { trial: "تجريبي", basic: "أساسي", pro: "احترافي" };
const subLabels: Record<string, string> = {
  trialing: "فترة تجربة",
  active: "نشط",
  past_due: "متأخر السداد",
  canceled: "ملغى",
};
const roleLabels: Record<string, string> = { owner: "مالك", admin: "مشرف", member: "عضو" };
const sel = "h-9 rounded-lg border border-input bg-secondary/40 px-2 text-xs";

function AdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"orgs" | "users">("orgs");
  const [q, setQ] = useState("");

  const orgs = useQuery({
    queryKey: ["admin-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_orgs");
      if (error) throw error;
      return data;
    },
  });
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return data;
    },
  });

  const o = orgs.data ?? [];
  const u = users.data ?? [];
  const stats = {
    orgs: o.length,
    active: o.filter((x) => x.status === "active").length,
    paying: o.filter((x) => x.subscription_status === "active").length,
    users: u.length,
    blocked: u.filter((x) => x.blocked).length + o.filter((x) => x.status === "blocked").length,
  };

  const term = q.trim().toLowerCase();
  const fo = useMemo(() => o.filter((x) => !term || `${x.name} ${x.owner_email ?? ""}`.toLowerCase().includes(term)), [o, term]);
  const fu = useMemo(() => u.filter((x) => !term || `${x.full_name} ${x.email} ${x.organization_name ?? ""}`.toLowerCase().includes(term)), [u, term]);

  async function updateOrg(org: (typeof o)[number], patch: Partial<(typeof o)[number]>) {
    const n = { ...org, ...patch };
    const { error } = await supabase.rpc("admin_update_org", {
      _org: n.id,
      _status: n.status,
      _plan: n.plan,
      _subscription_status: n.subscription_status,
      _ends: n.subscription_ends_at as string,
      _notes: n.notes,
    });
    if (error) {
      toast.error("تعذّر حفظ التعديل");
      return;
    }
    toast.success("تم الحفظ");
    qc.invalidateQueries({ queryKey: ["admin-orgs"] });
  }

  async function setBlocked(userId: string, blocked: boolean) {
    const { error } = await supabase.rpc("admin_set_user_blocked", { _user: userId, _blocked: blocked });
    if (error) {
      toast.error(error.message.includes("yourself") ? "لا يمكنك إيقاف حسابك" : "تعذّر التنفيذ");
      return;
    }
    toast.success(blocked ? "تم إيقاف المستخدم" : "تم تفعيل المستخدم");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <AppShell title="إدارة المنصة" subtitle="جميع الشركات والمستخدمين المسجلين، وحالة الاشتراك والوصول.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Building2} label="الشركات" value={stats.orgs} hint={`${stats.active} نشطة`} />
        <Stat icon={CreditCard} label="اشتراكات مدفوعة" value={stats.paying} hint="حالة الاشتراك: نشط" />
        <Stat icon={Users} label="المستخدمون" value={stats.users} hint="إجمالي الحسابات" />
        <Stat icon={Ban} label="موقوفون" value={stats.blocked} hint="شركات ومستخدمون" />
      </div>

      <div className="frost flex flex-wrap items-center gap-2 rounded-2xl p-3">
        {(["orgs", "users"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm ${tab === t ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground hover:bg-secondary/60"}`}
          >
            {t === "orgs" ? "الشركات" : "المستخدمون"}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث بالاسم أو البريد"
          className="ms-auto h-10 min-w-48 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {tab === "orgs" ? (
        <ul className="space-y-3">
          {fo.map((x) => (
            <li key={x.id} className="frost rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold">
                    {x.name}
                    {x.status === "blocked" ? (
                      <span className="rounded-full border border-destructive/30 bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive">موقوفة</span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span dir="ltr">{x.owner_email ?? "—"}</span> · {x.members} عضو · {x.assets} معدة · {x.inspections} فحص · منذ {x.created_at.slice(0, 10)}
                  </div>
                </div>
                <button
                  onClick={() => updateOrg(x, { status: x.status === "active" ? "blocked" : "active" })}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${x.status === "active" ? "border border-destructive/40 text-destructive hover:bg-destructive/10" : "bg-primary text-primary-foreground"}`}
                >
                  {x.status === "active" ? <Ban className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                  {x.status === "active" ? "إيقاف الشركة" : "إعادة التفعيل"}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-3 text-xs text-muted-foreground">
                <label className="flex flex-col gap-1">
                  الباقة
                  <select value={x.plan} onChange={(e) => updateOrg(x, { plan: e.target.value })} className={sel}>
                    {Object.entries(planLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  حالة الاشتراك
                  <select value={x.subscription_status} onChange={(e) => updateOrg(x, { subscription_status: e.target.value })} className={sel}>
                    {Object.entries(subLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  ينتهي في
                  <input
                    type="date"
                    defaultValue={x.subscription_ends_at ?? ""}
                    onBlur={(e) => e.target.value !== (x.subscription_ends_at ?? "") && updateOrg(x, { subscription_ends_at: e.target.value || null })}
                    className={sel}
                  />
                </label>
                <label className="flex min-w-48 flex-1 flex-col gap-1">
                  ملاحظات داخلية
                  <input
                    defaultValue={x.notes}
                    onBlur={(e) => e.target.value !== x.notes && updateOrg(x, { notes: e.target.value })}
                    className={sel}
                  />
                </label>
              </div>
            </li>
          ))}
          {!orgs.isLoading && fo.length === 0 ? <Empty /> : null}
        </ul>
      ) : (
        <div className="frost overflow-hidden rounded-2xl">
          <ul className="divide-y divide-border">
            {fu.map((x) => (
              <li key={x.user_id} className="flex flex-wrap items-center gap-3 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {x.full_name || x.email}
                    {x.is_super_admin ? <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] text-primary">مدير المنصة</span> : null}
                    {x.blocked ? <span className="rounded-full border border-destructive/30 bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive">موقوف</span> : null}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span dir="ltr">{x.email}</span> · {x.organization_name ?? "بدون شركة"} · {roleLabels[x.role ?? ""] ?? "—"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    سجّل {x.created_at.slice(0, 10)} · آخر دخول {x.last_sign_in_at?.slice(0, 10) ?? "—"}
                  </div>
                </div>
                {!x.is_super_admin ? (
                  <button
                    onClick={() => setBlocked(x.user_id, !x.blocked)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${x.blocked ? "bg-primary text-primary-foreground" : "border border-destructive/40 text-destructive hover:bg-destructive/10"}`}
                  >
                    {x.blocked ? <CheckCircle2 className="size-3.5" /> : <Ban className="size-3.5" />}
                    {x.blocked ? "تفعيل" : "إيقاف"}
                  </button>
                ) : null}
              </li>
            ))}
            {!users.isLoading && fu.length === 0 ? <Empty /> : null}
          </ul>
        </div>
      )}
    </AppShell>
  );
}

function Empty() {
  return <li className="list-none p-8 text-center text-sm text-muted-foreground">لا توجد نتائج.</li>;
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Users; label: string; value: number; hint: string }) {
  return (
    <div className="frost rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="size-5 text-primary" />
      </div>
      <div className="mt-3 font-display text-3xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
