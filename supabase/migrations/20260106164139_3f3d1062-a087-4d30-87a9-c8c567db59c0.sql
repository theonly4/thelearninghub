-- Remove the overly permissive policy that exposes quiz answers
DROP POLICY IF EXISTS "Authenticated users can view quiz questions for view" ON public.quiz_questions;

-- Verify only platform_owner policies remain for quiz_questions
-- The quiz questions should only be accessed by:
-- 1. Platform owners directly (for management)
-- 2. Service role via Edge Functions (for quiz taking and scoring)