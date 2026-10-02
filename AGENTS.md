<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- App pages live under `src/routes/_authenticated/` (client-only gate that also calls the `ensure_account` RPC); `/`, `/auth`, `/reset-password` are public — keeps login state out of SSR.
- All business data is scoped by `organization_id` with RLS via `user_org_id()` / `is_org_admin()` — gives team sharing without trusting the client.
- Pages read data through `orgDataQuery` / `meQuery` in `src/lib/org-data.ts`, and stats/charts are computed from live rows there — one source of truth.
- Compliance state is derived from `next_inspection` (overdue / within 30 days / compliant), not stored — avoids scheduled jobs.
- Platform super admin is a `super_admin` row in `user_roles`, granted by `ensure_platform_admin()` to the owner's email; all `/admin` reads/writes go through `admin_*` security-definer RPCs that check `has_role` — company admins can never change status/plan.
- Blocking is enforced in `user_org_id()` (blocked user or blocked company ⇒ no data) plus a blocked screen in the `_authenticated` gate.
