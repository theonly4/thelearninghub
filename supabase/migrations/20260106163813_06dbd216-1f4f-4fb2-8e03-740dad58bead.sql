-- Revert the overly permissive policy - it exposes correct_answer
DROP POLICY IF EXISTS "Authenticated users can view quiz questions for view" ON public.quiz_questions;

-- Drop the view since we'll use an Edge Function instead
DROP VIEW IF EXISTS public.quiz_questions_public;