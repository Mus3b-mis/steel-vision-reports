ALTER TABLE public.inspections
  ADD COLUMN inspection_kind text NOT NULL DEFAULT 'periodic' CHECK (inspection_kind IN ('periodic','checkout','checkin')),
  ADD COLUMN driver_name text NOT NULL DEFAULT '',
  ADD COLUMN fuel_level integer CHECK (fuel_level IS NULL OR fuel_level IN (0,25,50,75,100));