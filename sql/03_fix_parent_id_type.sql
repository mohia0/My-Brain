-- Fix for incompatible types: ID is text, so parent_id must be text

ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS parent_id text REFERENCES public.folders(id);

-- Add other potentially missing columns 
ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS position_x numeric DEFAULT 0;

ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS position_y numeric DEFAULT 0;

ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS color text DEFAULT '#6e56cf';
