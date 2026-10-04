create or replace function public.ensure_account()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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

  -- sample fleet data
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score, asset_type, plate_number, vin, odometer, make, model, year)
    values (_org,'VH-1042','شاحنة نقل متوسطة','شاحنات','أسطول الرياض','TY-DYNA-88214','operational', current_date-20, current_date+70, 92,'vehicle','أ ب ج 4821','JTFBU4HE2NB038214',84500,'تويوتا','داينا 300',2023) returning id into a1;
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score, asset_type, plate_number, vin, odometer, make, model, year)
    values (_org,'VH-2098','بكب نقل خفيف','مركبات خفيفة','أسطول جدة','IS-DMAX-4471','needs_attention', current_date-10, current_date+12, 68,'vehicle','هـ د و 7315','MPATFS85JLT044715',132800,'إيسوزو','ديماكس',2021) returning id into a2;
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score, asset_type, plate_number, vin, odometer, make, model, year)
    values (_org,'VH-3310','حافلة نقل موظفين','حافلات','أسطول الرياض','MB-SPR-1129','operational', current_date-75, current_date+45, 88,'vehicle','ك ل م 2094','WDB9066331S581129',96700,'مرسيدس','سبرينتر',2022) returning id into a3;
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score, asset_type, plate_number, vin, odometer, make, model, year)
    values (_org,'VH-4521','شاحنة صهريج مياه','شاحنات','موقع مشروع الدمام','VO-FM-7742','needs_attention', current_date-130, current_date-40, 54,'vehicle','ن س ع 1568','YV2A4B3C5HA077425',214300,'فولفو','FM 420',2019) returning id into a4;
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score, asset_type, plate_number, vin, odometer, make, model, year)
    values (_org,'VH-5077','سيدان إدارية','مركبات خفيفة','أسطول جدة','TY-CAM-3390','operational', current_date-30, current_date+20, 81,'vehicle','ط ق ر 9027','4T1BF1FK5HU523390',41200,'تويوتا','كامري',2024) returning id into a5;
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score, asset_type, plate_number, vin, odometer, make, model, year)
    values (_org,'VH-6188','رافعة شوكية ديزل 3 طن','معدات مناولة','مستودع ينبع','CT-3F-5521','out_of_service', current_date-170, current_date-80, 37,'equipment','','','6200','كاتربيلر','DP30N',2018) returning id into a6;
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score, asset_type, plate_number, vin, odometer, make, model, year)
    values (_org,'VH-7203','شاحنة قلاب ثقيلة','شاحنات','موقع مشروع الدمام','SC-P-2287','operational', current_date-5, current_date+85, 95,'vehicle','ز ش ص 6640','XLRTE47MS0E822875',158900,'سكانيا','P410',2023) returning id into a7;
  insert into assets (organization_id, code, name, category, site, serial, status, last_inspection, next_inspection, health_score, asset_type, plate_number, vin, odometer, make, model, year)
    values (_org,'VH-8145','مولد كهربائي احتياطي 500 ك.ف.أ','أنظمة كهربائية','موقع مشروع الدمام','GN-500-6612','needs_attention', current_date-50, current_date+8, 73,'equipment','','','3100','بيركنز','2506C-E15TAG2',2020) returning id into a8;

  insert into inspections (organization_id, asset_id, asset_name, code, inspector_name, inspected_on, result, findings, findings_count, source, health_score) values
    (_org,a7,'شاحنة قلاب ثقيلة','INS-9041','م. سارة العتيبي',current_date-5,'pass','الإطارات والفرامل والهيكل بحالة ممتازة، لا توجد ملاحظات جوهرية.',0,'manual',95),
    (_org,a2,'بكب نقل خفيف','INS-9038','م. سارة العتيبي',current_date-10,'conditional','تآكل غير متساوٍ في الإطار الأمامي الأيسر وتسريب بسيط من علبة التوجيه، يلزم ضبط الزوايا.',2,'manual',68),
    (_org,a1,'شاحنة نقل متوسطة','INS-9031','م. ريم القحطاني',current_date-20,'pass','الفرامل والإضاءة والسوائل ضمن النطاق، تم تحديث ملصق الفحص.',0,'manual',92),
    (_org,a5,'سيدان إدارية','INS-9024','م. عبدالله الحربي',current_date-30,'conditional','خدوش سطحية في الصدام الخلفي وضعف في شحن المكيف، يوصى بالمتابعة.',1,'ai',81),
    (_org,a8,'مولد كهربائي احتياطي 500 ك.ف.أ','INS-9012','م. فهد الدوسري',current_date-50,'conditional','ارتفاع في حرارة المبادل الحراري تحت الحمل الكامل، يتطلب تنظيف المشعاع.',2,'ai',73),
    (_org,a3,'حافلة نقل موظفين','INS-8950','م. ريم القحطاني',current_date-75,'pass','فحص شامل للفرامل وأنظمة الأمان والكهرباء، القراءات داخل النطاق المسموح.',0,'manual',88),
    (_org,a3,'حافلة نقل موظفين','INS-8931','م. فهد الدوسري',current_date-100,'conditional','ارتخاء في أحد أحزمة الأمان الخلفية، تم الإصلاح والتوثيق.',1,'manual',84),
    (_org,a4,'شاحنة صهريج مياه','INS-8977','م. ماجد الشمري',current_date-130,'conditional','اهتزاز ملحوظ عند السرعات العالية ووجود انبعاج في الرفرف الأيمن.',2,'manual',54),
    (_org,a1,'شاحنة نقل متوسطة','INS-8960','م. ريم القحطاني',current_date-140,'pass','فحص دوري بدون ملاحظات.',0,'manual',90),
    (_org,a6,'رافعة شوكية ديزل 3 طن','INS-8996','م. ماجد الشمري',current_date-170,'fail','تآكل متقدم في الشوكة اليسرى وتسريب هيدروليكي، أوقفت المعدة لحين الإصلاح.',3,'manual',37),
    (_org,a7,'شاحنة قلاب ثقيلة','INS-8912','م. سارة العتيبي',current_date-160,'pass','تآكل طفيف في بطانات الفرامل ضمن الحدود.',1,'manual',91),
    (_org,a5,'سيدان إدارية','INS-8901','م. عبدالله الحربي',current_date-120,'pass','القراءات طبيعية.',0,'manual',86);

  return _org;
end;
$$;

revoke all on function public.ensure_account() from public, anon;
grant execute on function public.ensure_account() to authenticated;