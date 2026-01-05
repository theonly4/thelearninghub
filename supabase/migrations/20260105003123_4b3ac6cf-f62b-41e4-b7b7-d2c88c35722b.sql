-- Change profiles.workforce_group from single enum to array of enums
-- First, rename the old column temporarily
ALTER TABLE public.profiles RENAME COLUMN workforce_group TO workforce_group_old;

-- Add new array column
ALTER TABLE public.profiles ADD COLUMN workforce_groups workforce_group[] DEFAULT '{}';

-- Migrate existing data: convert single value to array
UPDATE public.profiles 
SET workforce_groups = CASE 
  WHEN workforce_group_old IS NOT NULL THEN ARRAY[workforce_group_old]
  ELSE '{}'
END;

-- Drop the old column
ALTER TABLE public.profiles DROP COLUMN workforce_group_old;

-- Add an index for efficient array queries
CREATE INDEX idx_profiles_workforce_groups ON public.profiles USING GIN(workforce_groups);