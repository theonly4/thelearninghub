-- Fix the view to use SECURITY INVOKER (the default, safer option)
-- Drop and recreate the view with explicit security invoker
DROP VIEW IF EXISTS public.quiz_questions_public;

CREATE VIEW public.quiz_questions_public 
WITH (security_invoker = on)
AS
SELECT 
  id, 
  quiz_id, 
  question_number, 
  scenario, 
  question_text, 
  options, 
  rationale, 
  hipaa_section, 
  hipaa_topic_id,
  workforce_groups,
  created_at,
  updated_at
FROM public.quiz_questions;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.quiz_questions_public TO authenticated;