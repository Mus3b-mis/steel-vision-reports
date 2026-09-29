revoke all on function public.user_org_id() from public, anon;
revoke all on function public.is_org_admin() from public, anon;
grant execute on function public.user_org_id() to authenticated;
grant execute on function public.is_org_admin() to authenticated;