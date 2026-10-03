ALTER TABLE public.assets
  ADD COLUMN asset_type text NOT NULL DEFAULT 'vehicle',
  ADD COLUMN plate_number text NOT NULL DEFAULT '',
  ADD COLUMN vin text NOT NULL DEFAULT '',
  ADD COLUMN odometer integer,
  ADD COLUMN make text NOT NULL DEFAULT '',
  ADD COLUMN model text NOT NULL DEFAULT '',
  ADD COLUMN year integer;
ALTER TABLE public.inspections
  ADD COLUMN checklist jsonb,
  ADD COLUMN odometer integer;
UPDATE public.assets SET asset_type = 'equipment';