CREATE OR REPLACE FUNCTION public.enforce_inspection_approval() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE _last_handover text;
BEGIN
 IF current_user IN ('authenticated','anon') THEN
  IF TG_OP='INSERT' THEN NEW.created_by:=auth.uid(); NEW.approval_status:=CASE WHEN public.is_org_admin() THEN 'approved' ELSE 'pending' END; NEW.approved_by:=CASE WHEN public.is_org_admin() THEN auth.uid() ELSE NULL END; NEW.approved_at:=CASE WHEN public.is_org_admin() THEN now() ELSE NULL END;
  ELSE IF NOT public.is_org_admin() THEN RAISE EXCEPTION 'forbidden'; END IF; IF NEW.approval_status='approved' THEN NEW.approved_by:=auth.uid(); NEW.approved_at:=now(); END IF; END IF;
 END IF;
 IF NEW.approval_status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'invalid approval status'; END IF;
 IF NEW.asset_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM assets WHERE id=NEW.asset_id AND organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'invalid asset'; END IF;
 IF NEW.inspection_kind='checkin' AND (TG_OP='INSERT' OR NEW.asset_id IS DISTINCT FROM OLD.asset_id OR NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.inspection_kind IS DISTINCT FROM OLD.inspection_kind OR NEW.approval_status IS DISTINCT FROM OLD.approval_status) THEN
  IF NEW.asset_id IS NULL THEN RAISE EXCEPTION 'checkin_requires_selected_vehicle'; END IF;
  IF NOT EXISTS(SELECT 1 FROM assets WHERE id=NEW.asset_id AND organization_id=NEW.organization_id AND asset_type='vehicle') THEN RAISE EXCEPTION 'checkin_requires_vehicle'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(NEW.asset_id::text));
  SELECT i.inspection_kind INTO _last_handover
  FROM public.inspections i
  WHERE i.organization_id=NEW.organization_id AND i.asset_id=NEW.asset_id AND i.id<>NEW.id AND i.approval_status='approved' AND i.inspection_kind IN ('checkout','checkin')
  ORDER BY i.created_at DESC, i.id DESC LIMIT 1;
  IF coalesce(_last_handover,'')<>'checkout' THEN RAISE EXCEPTION 'checkin_requires_active_checkout'; END IF;
 END IF;
 RETURN NEW;
END $$;