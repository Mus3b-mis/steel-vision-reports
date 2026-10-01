create type public.app_role as enum ('super_admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

create table public.blocked_users (
  user_id uuid primary key,
  reason text not null default '',
  blocked_at timestamptz not null default now()
);
grant all on public.blocked_users to service_role;
alter table public.blocked_users enable row level security;

alter table public.organizations
  add column status text not null default 'active' check (status in ('active','blocked')),
  add column plan text not null default 'trial' check (plan in ('trial','basic','pro')),
  add column subscription_status text not null default 'trialing' check (subscription_status in ('trialing','active','past_due','canceled')),
  add column subscription_ends_at date default (current_date + 30),
  add column notes text not null default '';

-- company admins must not change their own status/plan
drop policy "admins update own org" on public.organizations;

-- blocked users / companies lose all data access
create or replace function public.user_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select m.organization_id from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid() and o.status = 'active'
    and not exists (select 1 from public.blocked_users b where b.user_id = auth.uid())
  limit 1
$$;

create or replace function public.my_access_state()
returns text language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from blocked_users where user_id = auth.uid()) then 'blocked_user'
    when exists (select 1 from organization_members m join organizations o on o.id = m.organization_id
                 where m.user_id = auth.uid() and o.status = 'blocked') then 'blocked_org'
    else 'ok' end
$$;
revoke all on function public.my_access_state() from public, anon;
grant execute on function public.my_access_state() to authenticated;

-- grant super admin to the platform owner on sign-in
create or replace function public.ensure_platform_admin()
returns void language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(auth.jwt()->>'email','')) = 'musaab.alawbathani@gmail.com' then
    insert into user_roles (user_id, role) values (auth.uid(), 'super_admin') on conflict do nothing;
  end if;
end $$;
revoke all on function public.ensure_platform_admin() from public, anon;
grant execute on function public.ensure_platform_admin() to authenticated;

create or replace function public.admin_list_orgs()
returns table (id uuid, name text, status text, plan text, subscription_status text,
  subscription_ends_at date, notes text, created_at timestamptz, owner_email text,
  members bigint, assets bigint, inspections bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not has_role(auth.uid(), 'super_admin') then raise exception 'forbidden'; end if;
  return query
  select o.id, o.name, o.status, o.plan, o.subscription_status, o.subscription_ends_at, o.notes, o.created_at,
    (select p.email from organization_members m join profiles p on p.id = m.user_id
       where m.organization_id = o.id and m.role = 'owner' limit 1),
    (select count(*) from organization_members m where m.organization_id = o.id),
    (select count(*) from assets a where a.organization_id = o.id),
    (select count(*) from inspections i where i.organization_id = o.id)
  from organizations o order by o.created_at desc;
end $$;

create or replace function public.admin_list_users()
returns table (user_id uuid, full_name text, email text, job_title text, role text,
  organization_id uuid, organization_name text, blocked boolean, is_super_admin boolean,
  created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not has_role(auth.uid(), 'super_admin') then raise exception 'forbidden'; end if;
  return query
  select p.id, p.full_name, p.email, p.job_title, m.role::text, o.id, o.name,
    exists (select 1 from blocked_users b where b.user_id = p.id),
    has_role(p.id, 'super_admin'), p.created_at, u.last_sign_in_at
  from profiles p
  left join organization_members m on m.user_id = p.id
  left join organizations o on o.id = m.organization_id
  left join auth.users u on u.id = p.id
  order by p.created_at desc;
end $$;

create or replace function public.admin_update_org(_org uuid, _status text, _plan text,
  _subscription_status text, _ends date, _notes text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role(auth.uid(), 'super_admin') then raise exception 'forbidden'; end if;
  update organizations set status = _status, plan = _plan, subscription_status = _subscription_status,
    subscription_ends_at = _ends, notes = coalesce(_notes, '') where id = _org;
end $$;

create or replace function public.admin_set_user_blocked(_user uuid, _blocked boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role(auth.uid(), 'super_admin') then raise exception 'forbidden'; end if;
  if _user = auth.uid() then raise exception 'cannot block yourself'; end if;
  if _blocked then
    insert into blocked_users (user_id) values (_user) on conflict do nothing;
  else
    delete from blocked_users where user_id = _user;
  end if;
end $$;

revoke all on function public.admin_list_orgs() from public, anon;
revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_update_org(uuid, text, text, text, date, text) from public, anon;
revoke all on function public.admin_set_user_blocked(uuid, boolean) from public, anon;
grant execute on function public.admin_list_orgs() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_update_org(uuid, text, text, text, date, text) to authenticated;
grant execute on function public.admin_set_user_blocked(uuid, boolean) to authenticated;