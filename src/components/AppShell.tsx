import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/org-data";
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  ShieldCheck,
  ScanSearch,
  Bell,
  Search,
  Users,
  LogOut,
} from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "لوحة المعلومات", icon: LayoutDashboard },
  { to: "/equipment", label: "سجل المعدات", icon: Boxes },
  { to: "/inspections", label: "سجل الفحوصات", icon: ClipboardList },
  { to: "/compliance", label: "حالة الامتثال", icon: ShieldCheck },
  { to: "/ai-inspection", label: "الفحص الذكي بالصور", icon: ScanSearch },
  { to: "/team", label: "الفريق", icon: Users },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { data: me } = useQuery(meQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  const roleLabel = me?.role === "owner" ? "مالك الحساب" : me?.role === "admin" ? "مشرف" : "عضو";
  return (
    <div className="min-h-screen lg:flex">
      <aside className="frost brushed sticky top-0 z-20 hidden w-64 shrink-0 flex-col gap-2 rounded-none border-y-0 border-s-0 p-5 lg:flex lg:h-screen">
        <Brand />
        <nav className="mt-6 flex flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              activeProps={{
                className:
                  "bg-secondary/80 text-foreground font-semibold shadow-[inset_0_1px_0_0_oklch(1_0_0/10%)]",
              }}
            >
              <item.icon className="size-4.5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="frost mt-auto rounded-xl p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-1 font-semibold text-foreground">{me?.orgName || "شركتي"}</p>
          البيانات مشتركة بين جميع أعضاء فريق شركتك.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="frost sticky top-0 z-30 flex flex-wrap items-center gap-3 rounded-none border-x-0 border-t-0 px-4 py-3 sm:px-6">
          <div className="lg:hidden">
            <Brand compact />
          </div>
          <div className="order-3 flex w-full items-center gap-2 sm:order-none sm:w-auto sm:flex-1">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                dir="rtl"
                placeholder="ابحث عن معدة أو رقم فحص…"
                className="h-10 w-full rounded-lg border border-input bg-secondary/40 pe-9 ps-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <button
            aria-label="التنبيهات"
            className="relative grid size-10 place-items-center rounded-lg border border-input bg-secondary/40 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Bell className="size-4.5" />
            <span className="absolute end-2.5 top-2.5 size-2 rounded-full bg-warning" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-full bg-primary/20 text-sm font-bold text-primary">
              {(me?.fullName || "؟").trim().charAt(0)}
            </div>
            <div className="hidden text-xs leading-tight sm:block">
              <div className="font-semibold">{me?.fullName}</div>
              <div className="text-muted-foreground">{me?.jobTitle || roleLabel}</div>
            </div>
            <button
              onClick={signOut}
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
              className="grid size-9 place-items-center rounded-lg border border-input bg-secondary/40 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        <nav className="frost flex gap-1 overflow-x-auto rounded-none border-x-0 border-t-0 px-3 py-2 lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true }}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-muted-foreground"
              activeProps={{ className: "bg-secondary/80 text-foreground font-semibold" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-6xl">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p> : null}
            <div className="mt-6 space-y-6">{children}</div>
          </div>
        </main>

        <footer className="px-6 pb-8 pt-2 text-center text-xs text-muted-foreground">
          وثيق — منصة فحص الأصول والمعدات
        </footer>
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-xl border border-border bg-primary/15 font-display text-lg font-black text-primary">
        و
      </div>
      <div className="leading-tight">
        <div className="font-display text-lg font-extrabold text-gradient-steel">وثيق</div>
        {!compact ? (
          <div className="text-[11px] text-muted-foreground">Watheeq Inspection Cloud</div>
        ) : null}
      </div>
    </div>
  );
}
