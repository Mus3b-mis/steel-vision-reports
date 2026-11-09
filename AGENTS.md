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
- Inspection photos live in the private `inspection-photos` bucket at `<organization_id>/<inspection_id>/<n>.jpg` (storage RLS checks the first folder against `user_org_id()`); paths are stored in `inspections.photos` and shown via signed URLs — keeps photos company-private. Photos are downscaled in the browser before analysis so many photos fit one request.
- The in-progress AI inspection (photos, fields, report) is saved per user in IndexedDB (`src/lib/inspection-draft.ts`) and restored on load; cleared on approve or "فحص جديد" — phones reload the tab while the camera is open.
- The root auth listener ignores repeated `SIGNED_IN` for the same user — mobile browsers re-emit it when the tab regains focus, which would reload pages and drop unsaved work.

- Company membership stays in organization_members; join codes live in a separate manager-readable table and all joins/role changes use authenticated SQL RPCs — codes never grant elevated roles or switch an existing company.
- Directors assign supervisors and rotate codes; supervisors manage fleet and approve pending member inspections; RLS and approval triggers enforce the same hierarchy as companyPermissions — UI hiding is not authorization.
- Users without company membership complete CompanyOnboarding inside the gate; ensure_account only auto-joins valid signup codes/invites or explicitly named companies — Google users must choose their company before data access.
