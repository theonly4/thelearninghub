-- Create a view for quiz questions that excludes the correct_answer column
-- This view should be used by client applications to prevent answer leakage
CREATE OR REPLACE VIEW public.quiz_questions_public AS
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

-- Revoke direct SELECT on quiz_questions from authenticated users
-- Keep it for service_role only (used by Edge Functions for scoring)
REVOKE SELECT ON public.quiz_questions FROM authenticated;

-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Authenticated users can view quiz questions" ON public.quiz_questions;

-- Create new restrictive policy that only allows platform_owner to SELECT directly
CREATE POLICY "Platform owners can view full quiz questions"
  ON public.quiz_questions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_owner'::public.app_role));