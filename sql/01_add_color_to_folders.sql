-- Run this in your Supabase SQL Editor to fix the "missing color column" error

ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS color text DEFAULT '#6e56cf';

-- If you want to backfill existing folders with a default color:
UPDATE public.folders 
SET color = '#6e56cf' 
WHERE color IS NULL;
