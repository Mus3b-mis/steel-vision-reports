create type public.org_role as enum ('owner', 'admin', 'member');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key,
  full_name text not null default '',
  job_title text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null unique,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now()
);

create table public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.org_role not null default 'member',
  invited_by uuid,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null default ('EQ-' || (1000 + floor(random() * 9000))::int),
  name text not null,
  category text not null default '',
  site text not null default '',
  serial text not null default '',
  status text not null default 'operational' check (status in ('operational','needs_attention','out_of_service')),
  last_inspection date,
  next_inspection date,
  health_score int not null default 100 check (health_score between 0 and 100),
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete set null,
  asset_name text not null,
  code text not null default ('INS-' || (10000 + floor(random() * 90000))::int),
  inspector_name text not null default '',
  inspected_on date not null default current_date,
  result text not null check (result in ('pass','conditional','fail')),
  findings text not null default '',
  findings_count int not null default 0,
  source text not null default 'manual' check (source in ('manual','ai')),
  health_score int,
  report jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index on public.assets (organization_id);
create index on public.inspections (organization_id, inspected_on desc);

grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.organization_invites to authenticated;
grant select, insert, update, delete on public.assets to authenticated;
grant select, insert, update, delete on public.inspections to authenticated;
grant all on public.organizations, public.profiles, public.organization_members, public.organization_invites, public.assets, public.inspections to service_role;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;
alter table public.assets enable row level security;
alter table public.inspections enable row level security;

create or replace function public.user_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.organization_members where user_id = auth.uid() limit 1
$$;

create or replace function public.is_org_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members
    where user_id = auth.uid() and role in ('owner','admin'))
$$;

-- organizations
create policy "members read own org" on public.organizations for select to authenticated
  using (id = public.user_org_id());
create policy "admins update own org" on public.organizations for update to authenticated
  using (id = public.user_org_id() and public.is_org_admin());

-- profiles
create policy "read profiles in org" on public.profiles for select to authenticated
  using (id = auth.uid() or id in (select user_id from public.organization_members where organization_id = public.user_org_id()));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- members
create policy "read members in org" on public.organization_members for select to authenticated
  using (organization_id = public.user_org_id());
create policy "admins remove members" on public.organization_members for delete to authenticated
  using (organization_id = public.user_org_id() and public.is_org_admin() and role <> 'owner' and user_id <> auth.uid());

-- invites
create policy "admins read invites" on public.organization_invites for select to authenticated
  using (organization_id = public.user_org_id() and public.is_org_admin());
create policy "admins create invites" on public.organization_invites for insert to authenticated
  with check (organization_id = public.user_org_id() and public.is_org_admin() and role <> 'owner');
create policy "admins delete invites" on public.organization_invites for delete to authenticated
  using (organization_id = public.user_org_id() and public.is_org_admin());

-- assets
create policy "org read assets" on public.assets for select to authenticated using (organization_id = public.user_org_id());
create policy "org insert assets" on public.assets for insert to authenticated with check (organization_id = public.user_org_id());
create policy "org update assets" on public.assets for update to authenticated using (organization_id = public.user_org_id()) with check (organization_id = public.user_org_id());
create policy "org delete assets" on public.assets for delete to authenticated using (organization_id = public.user_org_id());

-- inspections
create policy "org read inspections" on public.inspections for select to authenticated using (organization_id = public.user_org_id());
create policy "org insert inspections" on public.inspections for insert to authenticated with check (organization_id = public.user_org_id());
create policy "org update inspections" on public.inspections for update to authenticated using (organization_id = public.user_org_id()) with check (organization_id = public.user_org_id());
create policy "org delete inspections" on public.inspections for delete to authenticated using (organization_id = public.user_org_id());

-- Account bootstrap: creates profile, joins invited org or creates a new org with sample data.
create or replace function public.ensure_account()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _email text := coalesce(auth.jwt()->>'email', '');
  _meta jsonb := coalesce(auth.jwt()->'user_metadata', '{}'::jsonb);
  _org uuid;
  _inv record;
  a1 uuid; a2 uuid; a3 uuid; a4 uuid; a5 uuid; a6 uuid; a7 uuid; a8 uuid;
begin
  if _uid is null then raise exception 'not authenticated'; end if;

  select organization_id into _org from organization_members where user_id = _uid;
  if _org is not null then return _org; end if;

  insert into profiles (id, full_name, job_title, email)
  values (_uid,
    coalesce(nullif(_meta->>'full_name',''), nullif(_meta->>'name',''), split_part(_email,'@',1)),
    coalesce(_meta->>'job_title',''), _email)
  on conflict (id) do nothing;

  select * into _inv from organization_invites
    where lower(email) = lower(_email) and accepted_at is null
    order by created_at limit 1;

  if found then
    insert into organization_members (organization_id, user_id, role) values (_inv.organization_id, _uid, _inv.role);
    update organization_invites set accepted_at = now() where id = _inv.id;
    return _inv.organization_id;
  end if;

  insert into organizations (name)
  values (coalesce(nullif(_meta->>'company',''), 'شركتي'))
  returning id into _org;
  insert into organization_members (organization_id, user_id, role) values (_org, _uid, 'owner');

  -- sample data
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score)
    values (_org,'EQ-1042','رافعة شوكية ديزل 3 طن','معدات مناولة','مستودع الرياض الرئيسي','TY-3F-88214','operational', current_date-20, current_date+70, 92) returning id into a1;
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score)
    values (_org,'EQ-2098','مضخة طرد مركزي خط الإنتاج B','معدات دوارة','مصنع جدة','GR-PM-4471','needs_attention', current_date-10, current_date+12, 68) returning id into a2;
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score)
    values (_org,'EQ-3310','لوحة توزيع كهربائي 400 فولت','أنظمة كهربائية','مستودع الرياض الرئيسي','SW-400-1129','operational', current_date-75, current_date+45, 88) returning id into a3;
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score)
    values (_org,'EQ-4521','سقالة معدنية متنقلة 6 م','معدات ارتفاعات','موقع مشروع الدمام','SC-6M-7742','needs_attention', current_date-130, current_date-40, 54) returning id into a4;
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score)
    values (_org,'EQ-5077','ضاغط هواء صناعي 75 كيلوواط','معدات دوارة','مصنع جدة','AC-75-3390','operational', current_date-30, current_date+20, 81) returning id into a5;
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score)
    values (_org,'EQ-6188','خزان ضغط بخاري أفقي','أوعية ضغط','مصنع ينبع','PV-H-5521','out_of_service', current_date-170, current_date-80, 37) returning id into a6;
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score)
    values (_org,'EQ-7203','حزام ناقل قسم التعبئة','خطوط نقل','مصنع ينبع','CB-PK-2287','operational', current_date-5, current_date+85, 95) returning id into a7;
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score)
    values (_org,'EQ-8145','مولد كهربائي احتياطي 500 ك.ف.أ','أنظمة كهربائية','موقع مشروع الدمام','GN-500-6612','needs_attention', current_date-50, current_date+8, 73) returning id into a8;

  insert into inspections (organization_id, asset_id, asset_name, code, inspector_name, inspected_on, result, findings, findings_count, source, health_score) values
    (_org,a7,'حزام ناقل قسم التعبئة','INS-9041','م. سارة العتيبي',current_date-5,'pass','لا توجد ملاحظات جوهرية، تم شد الحزام وتزييت البكرات.',0,'manual',95),
    (_org,a2,'مضخة طرد مركزي خط الإنتاج B','INS-9038','م. سارة العتيبي',current_date-10,'conditional','اهتزاز زائد عند 1450 دورة، يُرجّح تآكل كرسي التحميل الخلفي.',2,'manual',68),
    (_org,a1,'رافعة شوكية ديزل 3 طن','INS-9031','م. ريم القحطاني',current_date-20,'pass','الإطارات والفرامل بحالة جيدة، تم تحديث ملصق الفحص.',0,'manual',92),
    (_org,a5,'ضاغط هواء صناعي 75 كيلوواط','INS-9024','م. عبدالله الحربي',current_date-30,'conditional','تسريب زيت بسيط من وصلة التصريف، يلزم استبدال الحشوة خلال أسبوعين.',1,'ai',81),
    (_org,a8,'مولد كهربائي احتياطي 500 ك.ف.أ','INS-9012','م. فهد الدوسري',current_date-50,'conditional','ارتفاع في حرارة المبادل الحراري تحت الحمل الكامل، يتطلب تنظيف المشعاع.',2,'ai',73),
    (_org,a3,'لوحة توزيع كهربائي 400 فولت','INS-8950','م. ريم القحطاني',current_date-75,'pass','تم التصوير الحراري لجميع القواطع، القراءات داخل النطاق المسموح.',0,'manual',88),
    (_org,a3,'لوحة توزيع كهربائي 400 فولت','INS-8931','م. فهد الدوسري',current_date-100,'conditional','ارتخاء في أحد أطراف التوصيل، تم الشد والتوثيق.',1,'manual',84),
    (_org,a4,'سقالة معدنية متنقلة 6 م','INS-8977','م. ماجد الشمري',current_date-130,'conditional','غياب أحد حواجز الأمان الوسطية ووجود انحناء في قائم جانبي.',2,'manual',54),
    (_org,a1,'رافعة شوكية ديزل 3 طن','INS-8960','م. ريم القحطاني',current_date-140,'pass','فحص دوري بدون ملاحظات.',0,'manual',90),
    (_org,a6,'خزان ضغط بخاري أفقي','INS-8996','م. ماجد الشمري',current_date-170,'fail','صدأ سطحي متقدم حول اللحام العلوي، أوقفت المعدة لحين الفحص بالموجات فوق الصوتية.',3,'manual',37),
    (_org,a7,'حزام ناقل قسم التعبئة','INS-8912','م. سارة العتيبي',current_date-160,'pass','تآكل طفيف في الحزام ضمن الحدود.',1,'manual',91),
    (_org,a5,'ضاغط هواء صناعي 75 كيلوواط','INS-8901','م. عبدالله الحربي',current_date-120,'pass','القراءات طبيعية.',0,'manual',86);

  return _org;
end;
$$;

revoke all on function public.ensure_account() from public, anon;
grant execute on function public.ensure_account() to authenticated;
grant execute on function public.user_org_id() to authenticated;
grant execute on function public.is_org_admin() to authenticated;