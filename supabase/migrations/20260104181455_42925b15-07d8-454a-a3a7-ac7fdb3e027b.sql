-- Add workforce_groups column to quiz_questions table
ALTER TABLE public.quiz_questions 
ADD COLUMN workforce_groups text[] NOT NULL DEFAULT '{}'::text[];

-- Add a comment for documentation
COMMENT ON COLUMN public.quiz_questions.workforce_groups IS 'Workforce groups this question applies to. If empty, inherits from parent quiz.';