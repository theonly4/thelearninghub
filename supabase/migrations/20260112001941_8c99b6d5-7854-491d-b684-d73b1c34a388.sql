-- Add draft status column to quizzes table for Quiz Builder
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';

-- Add check constraint for status values  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quizzes_status_check'
  ) THEN
    ALTER TABLE public.quizzes 
    ADD CONSTRAINT quizzes_status_check 
    CHECK (status IN ('draft', 'published'));
  END IF;
END $$;