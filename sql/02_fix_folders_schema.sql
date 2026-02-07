-- Run this in your Supabase SQL Editor to fix missing columns in the folders table

-- Add parent_id if it doesn't exist (assuming id is uuid)
ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.folders(id);

-- Add other potentially missing columns to prevent future errors
ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS position_x numeric DEFAULT 0;

ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS position_y numeric DEFAULT 0;

ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS color text DEFAULT '#6e56cf';
