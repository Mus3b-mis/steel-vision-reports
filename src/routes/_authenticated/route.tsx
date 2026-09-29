import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

let bootstrappedFor: string | null = null;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    if (bootstrappedFor !== data.user.id) {
      const { error: e } = await supabase.rpc("ensure_account");
      if (e) throw e;
      bootstrappedFor = data.user.id;
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
