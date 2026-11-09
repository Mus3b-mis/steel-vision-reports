DO $$ DECLARE _def text; BEGIN
_def:=pg_get_functiondef('public.create_company_account(text)'::regprocedure);
_def:=replace(_def,'where lower(email) = lower(_email) and accepted_at is null','where lower(email) = lower(_email) and accepted_at is null and organization_id in (select id from organizations where status=''active'')');
_def:=replace(_def,'order by created_at limit 1;','order by created_at limit 1 for update;');
EXECUTE _def;
END $$;