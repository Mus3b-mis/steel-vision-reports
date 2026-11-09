ALTER TABLE public.inspections ADD COLUMN approval_status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.inspections ADD COLUMN approved_by uuid;
ALTER TABLE public.inspections ADD COLUMN approved_at timestamptz;
CREATE TABLE public.company_join_codes (organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE, code text NOT NULL UNIQUE DEFAULT ('WTQ-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,16))));
GRANT SELECT ON public.company_join_codes TO authenticated;
GRANT ALL ON public.company_join_codes TO service_role;
ALTER TABLE public.company_join_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers read company code" ON public.company_join_codes FOR SELECT TO authenticated USING (organization_id=public.user_org_id() AND public.is_org_admin());
INSERT INTO public.company_join_codes (organization_id) SELECT id FROM public.organizations;
CREATE FUNCTION public.initialize_company_code() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.company_join_codes(organization_id) VALUES(NEW.id); RETURN NEW; END $$;
CREATE TRIGGER initialize_company_code AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.initialize_company_code();
CREATE FUNCTION public.is_org_owner() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM organization_members WHERE user_id=auth.uid() AND organization_id=public.user_org_id() AND role='owner') $$;
CREATE FUNCTION public.join_company(_code text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid:=auth.uid(); _org uuid; _existing uuid;
BEGIN
 IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(_uid::text));
 IF EXISTS(SELECT 1 FROM blocked_users WHERE user_id=_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT c.organization_id INTO _org FROM company_join_codes c JOIN organizations o ON o.id=c.organization_id WHERE c.code=upper(trim(_code)) AND o.status='active';
 IF _org IS NULL THEN RAISE EXCEPTION 'invalid company code'; END IF;
 SELECT organization_id INTO _existing FROM organization_members WHERE user_id=_uid;
 IF _existing=_org THEN RETURN _org; END IF;
 IF _existing IS NOT NULL THEN RAISE EXCEPTION 'already belongs to a company'; END IF;
 INSERT INTO profiles(id,full_name,email) VALUES(_uid,coalesce(auth.jwt()->'user_metadata'->>'full_name',auth.jwt()->'user_metadata'->>'name',''),coalesce(auth.jwt()->>'email','')) ON CONFLICT DO NOTHING;
 INSERT INTO organization_members(organization_id,user_id,role) VALUES(_org,_uid,'member');
 RETURN _org;
END $$;
CREATE FUNCTION public.rotate_company_code() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE _code text; BEGIN IF NOT public.is_org_owner() THEN RAISE EXCEPTION 'forbidden'; END IF; UPDATE company_join_codes SET code='WTQ-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)) WHERE organization_id=public.user_org_id() RETURNING code INTO _code; RETURN _code; END $$;
CREATE FUNCTION public.set_company_member_role(_user uuid,_role public.org_role) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.is_org_owner() OR _role='owner' OR _user=auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF; UPDATE organization_members SET role=_role WHERE user_id=_user AND organization_id=public.user_org_id() AND role<>'owner'; IF NOT FOUND THEN RAISE EXCEPTION 'member not found'; END IF; END $$;
ALTER POLICY "admins remove members" ON public.organization_members USING (organization_id=public.user_org_id() AND user_id<>auth.uid() AND role<>'owner' AND (public.is_org_owner() OR (public.is_org_admin() AND role='member')));
ALTER POLICY "admins create invites" ON public.organization_invites WITH CHECK (organization_id=public.user_org_id() AND public.is_org_admin() AND (role='member' OR (role='admin' AND public.is_org_owner())));
ALTER POLICY "admins delete invites" ON public.organization_invites USING (organization_id=public.user_org_id() AND public.is_org_admin() AND (role='member' OR public.is_org_owner()));
ALTER POLICY "org insert assets" ON public.assets WITH CHECK (organization_id=public.user_org_id() AND public.is_org_admin());
ALTER POLICY "org update assets" ON public.assets USING (organization_id=public.user_org_id() AND public.is_org_admin()) WITH CHECK (organization_id=public.user_org_id() AND public.is_org_admin());
ALTER POLICY "org delete assets" ON public.assets USING (organization_id=public.user_org_id() AND public.is_org_owner());
ALTER POLICY "org update inspections" ON public.inspections USING (organization_id=public.user_org_id() AND public.is_org_admin()) WITH CHECK (organization_id=public.user_org_id() AND public.is_org_admin());
ALTER POLICY "org delete inspections" ON public.inspections USING (organization_id=public.user_org_id() AND public.is_org_owner());
ALTER POLICY "org insert inspections" ON public.inspections WITH CHECK (organization_id=public.user_org_id() AND created_by=auth.uid());
CREATE FUNCTION public.enforce_inspection_approval() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF current_user IN ('authenticated','anon') THEN
  IF TG_OP='INSERT' THEN NEW.created_by:=auth.uid(); NEW.approval_status:=CASE WHEN public.is_org_admin() THEN 'approved' ELSE 'pending' END; NEW.approved_by:=CASE WHEN public.is_org_admin() THEN auth.uid() ELSE NULL END; NEW.approved_at:=CASE WHEN public.is_org_admin() THEN now() ELSE NULL END;
  ELSE IF NOT public.is_org_admin() THEN RAISE EXCEPTION 'forbidden'; END IF; IF NEW.approval_status='approved' THEN NEW.approved_by:=auth.uid(); NEW.approved_at:=now(); END IF; END IF;
 END IF;
 IF NEW.approval_status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'invalid approval status'; END IF;
 IF NEW.asset_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM assets WHERE id=NEW.asset_id AND organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'invalid asset'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER enforce_inspection_approval BEFORE INSERT OR UPDATE ON public.inspections FOR EACH ROW EXECUTE FUNCTION public.enforce_inspection_approval();
CREATE FUNCTION public.approve_company_inspection(_inspection uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE _i public.inspections; BEGIN
 IF NOT public.is_org_admin() OR public.user_org_id() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO _i FROM inspections WHERE id=_inspection AND organization_id=public.user_org_id() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'inspection not found'; END IF; IF _i.approval_status='approved' THEN RETURN; END IF;
 UPDATE inspections SET approval_status='approved',approved_by=auth.uid(),approved_at=now() WHERE id=_inspection;
 UPDATE assets SET last_inspection=_i.inspected_on,next_inspection=_i.inspected_on+90,health_score=coalesce(_i.health_score,health_score),status=CASE _i.result WHEN 'pass' THEN 'operational' WHEN 'fail' THEN 'out_of_service' ELSE 'needs_attention' END,odometer=coalesce(_i.odometer,odometer) WHERE id=_i.asset_id AND organization_id=public.user_org_id() AND (last_inspection IS NULL OR last_inspection<=_i.inspected_on);
END $$;
DO $$ DECLARE _def text; BEGIN
 _def:=pg_get_functiondef('public.ensure_account()'::regprocedure);
 _def:=replace(_def,'public.ensure_account()','public.create_company_account(_name text)');
 _def:=replace(_def,'if _uid is null then raise exception ''not authenticated''; end if;','if _uid is null then raise exception ''not authenticated''; end if; perform pg_advisory_xact_lock(hashtext(_uid::text)); if exists(select 1 from blocked_users where user_id=_uid) then raise exception ''forbidden''; end if;');
 _def:=replace(_def,'coalesce(nullif(_meta->>''company'',''''), ''شركتي'')','coalesce(nullif(trim(_name),''''), ''شركتي'')');
 EXECUTE _def;
END $$;
CREATE OR REPLACE FUNCTION public.ensure_account() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE _org uuid; _inv record; _meta jsonb:=coalesce(auth.jwt()->'user_metadata','{}'::jsonb); BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
 SELECT organization_id INTO _org FROM organization_members WHERE user_id=auth.uid(); IF _org IS NOT NULL THEN RETURN _org; END IF;
 IF EXISTS(SELECT 1 FROM blocked_users WHERE user_id=auth.uid()) THEN RETURN NULL; END IF;
 IF nullif(trim(_meta->>'join_code'),'') IS NOT NULL THEN BEGIN RETURN public.join_company(_meta->>'join_code'); EXCEPTION WHEN raise_exception THEN RETURN NULL; END; END IF;
 SELECT * INTO _inv FROM organization_invites WHERE lower(email)=lower(auth.jwt()->>'email') AND accepted_at IS NULL AND organization_id IN (SELECT id FROM organizations WHERE status='active') ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF FOUND THEN RETURN public.create_company_account(NULL); END IF;
 IF nullif(trim(_meta->>'company'),'') IS NOT NULL THEN RETURN public.create_company_account(_meta->>'company'); END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.join_company(text), public.rotate_company_code(), public.set_company_member_role(uuid,public.org_role), public.is_org_owner(), public.approve_company_inspection(uuid), public.create_company_account(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.join_company(text), public.rotate_company_code(), public.set_company_member_role(uuid,public.org_role), public.is_org_owner(), public.approve_company_inspection(uuid), public.create_company_account(text) TO authenticated;
REVOKE ALL ON FUNCTION public.initialize_company_code() FROM PUBLIC,anon,authenticated;