-- Revoke any direct SELECT from anon role on quiz_attempts table as a hardening measure
REVOKE SELECT ON public.quiz_attempts FROM anon;

-- Also revoke INSERT, UPDATE, DELETE from anon for completeness
REVOKE INSERT, UPDATE, DELETE ON public.quiz_attempts FROM anon;

-- Add explicit comment documenting the security model
COMMENT ON TABLE public.quiz_attempts IS 'Quiz attempt records with scores and answers. RLS enabled. Users see only their own attempts; org_admins see all attempts in their organization. No public/anon access.';