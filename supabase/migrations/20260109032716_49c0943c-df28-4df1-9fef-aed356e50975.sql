-- Restore SELECT privilege for authenticated users on quiz_questions
-- RLS policies already restrict row visibility to platform_owner only
GRANT SELECT ON public.quiz_questions TO authenticated;

-- Explicitly revoke from anon as additional hardening
REVOKE SELECT ON public.quiz_questions FROM anon;