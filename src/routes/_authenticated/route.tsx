import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

let bootstrappedFor: string | null = null;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    if (bootstrappedFor !== data.user.id) {
      await supabase.rpc("ensure_platform_admin");
      const { error: e } = await supabase.rpc("ensure_account");
      if (e) throw e;
      bootstrappedFor = data.user.id;
    }
    const { data: access } = await supabase.rpc("my_access_state");
    return { user: data.user, access: (access ?? "ok") as string };
  },
  component: Gate,
});

function Gate() {
  const { access } = Route.useRouteContext();
  if (access === "ok") return <Outlet />;
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="frost max-w-md rounded-2xl p-8 text-center">
        <ShieldOff className="mx-auto size-10 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">تم إيقاف الوصول</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {access === "blocked_org"
            ? "تم إيقاف حساب شركتك في منصة وثيق. تواصل مع إدارة المنصة لإعادة التفعيل."
            : "تم إيقاف حسابك في منصة وثيق. تواصل مع إدارة المنصة لإعادة التفعيل."}
        </p>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
          className="mt-6 rounded-lg border border-input bg-secondary/40 px-4 py-2 text-sm hover:bg-secondary"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
