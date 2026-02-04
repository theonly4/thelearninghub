-- Add per-organization quiz configuration columns to package_releases
ALTER TABLE public.package_releases 
ADD COLUMN passing_score_override INTEGER CHECK (passing_score_override >= 50 AND passing_score_override <= 100),
ADD COLUMN max_attempts INTEGER CHECK (max_attempts >= 1 AND max_attempts <= 10);

-- Add comments for documentation
COMMENT ON COLUMN public.package_releases.passing_score_override IS 'Organization-specific passing score override (50-100%). NULL uses default 80%.';
COMMENT ON COLUMN public.package_releases.max_attempts IS 'Maximum quiz attempts allowed (1-10). NULL means unlimited.';