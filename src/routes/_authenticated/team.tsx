import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/org-data";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "الفريق | وثيق" },
      { name: "description", content: "إدارة أعضاء فريق شركتك ودعوة زملاء جدد في منصة وثيق." },
      { property: "og:title", content: "الفريق | وثيق" },
      { property: "og:description", content: "إدارة أعضاء فريق شركتك ودعوة زملاء جدد." },
    ],
  }),
  component: TeamPage,
});

const roleLabels = { owner: "مالك", admin: "مشرف", member: "عضو" } as const;

function TeamPage() {
  const qc = useQueryClient();
  const { data: me } = useQuery(meQuery);
  const isAdmin = me?.role === "owner" || me?.role === "admin";

  const members = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data: m, error } = await supabase.from("organization_members").select("user_id, role");
      if (error) throw error;
      const { data: p } = await supabase.from("profiles").select("id, full_name, job_title, email");
      return m.map((x) => ({ ...x, profile: p?.find((y) => y.id === x.user_id) }));
    },
  });
  const invites = useQuery({
    queryKey: ["team-invites"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_invites")
        .select("*")
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    const { error } = await supabase.from("organization_invites").insert({
      organization_id: me.orgId,
      email: email.trim().toLowerCase(),
      role,
      invited_by: me.userId,
    });
    if (error) { toast.error(error.code === "23505" ? "هذا البريد مدعو مسبقًا" : "تعذّر إرسال الدعوة"); return; }
    toast.success("تمت إضافة الدعوة — اطلب من زميلك إنشاء حساب بنفس البريد");
    setEmail("");
    qc.invalidateQueries({ queryKey: ["team-invites"] });
  }

  async function removeInvite(id: string) {
    await supabase.from("organization_invites").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["team-invites"] });
  }
  async function removeMember(userId: string) {
    const { error } = await supabase.from("organization_members").delete().eq("user_id", userId);
    if (error) { toast.error("تعذّر إزالة العضو"); return; }
    qc.invalidateQueries({ queryKey: ["team-members"] });
  }

  return (
    <AppShell title="الفريق" subtitle={`أعضاء ${me?.orgName ?? "شركتك"} يشتركون في نفس المعدات والفحوصات.`}>
      {isAdmin ? (
        <form onSubmit={invite} className="frost flex flex-wrap items-end gap-3 rounded-2xl p-5">
          <label className="min-w-56 flex-1 text-xs text-muted-foreground">
            بريد الزميل
            <input required type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-secondary/40 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <select value={role} onChange={(e) => setRole(e.target.value as "member" | "admin")} className="h-10 rounded-lg border border-input bg-secondary/40 px-3 text-sm">
            <option value="member">عضو</option>
            <option value="admin">مشرف</option>
          </select>
          <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
            <UserPlus className="size-4" /> دعوة
          </button>
        </form>
      ) : null}

      <section className="frost overflow-hidden rounded-2xl">
        <h2 className="border-b border-border p-5 text-base font-bold">الأعضاء</h2>
        <ul className="divide-y divide-border">
          {(members.data ?? []).map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center gap-3 p-5">
              <div className="grid size-9 place-items-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                {(m.profile?.full_name || "؟").charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{m.profile?.full_name || m.profile?.email}</div>
                <div className="text-xs text-muted-foreground" dir="ltr">{m.profile?.email}</div>
              </div>
              <span className="rounded-md border border-border px-2 py-1 text-xs">{roleLabels[m.role]}</span>
              {isAdmin && m.role !== "owner" && m.user_id !== me?.userId ? (
                <button onClick={() => removeMember(m.user_id)} aria-label="إزالة" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {isAdmin && invites.data?.length ? (
        <section className="frost overflow-hidden rounded-2xl">
          <h2 className="border-b border-border p-5 text-base font-bold">دعوات بانتظار التسجيل</h2>
          <ul className="divide-y divide-border">
            {invites.data.map((i) => (
              <li key={i.id} className="flex items-center gap-3 p-5 text-sm">
                <span className="flex-1" dir="ltr">{i.email}</span>
                <span className="text-xs text-muted-foreground">{roleLabels[i.role]}</span>
                <button onClick={() => removeInvite(i.id)} aria-label="إلغاء الدعوة" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
