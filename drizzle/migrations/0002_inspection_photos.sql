ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';

CREATE POLICY "Org members read inspection photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'inspection-photos' AND (storage.foldername(name))[1] = public.user_org_id()::text);

CREATE POLICY "Org members upload inspection photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inspection-photos' AND (storage.foldername(name))[1] = public.user_org_id()::text);

CREATE POLICY "Org admins delete inspection photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'inspection-photos' AND (storage.foldername(name))[1] = public.user_org_id()::text AND public.is_org_admin());