-- Revoke any direct SELECT from anon role on profiles table as a hardening measure
REVOKE SELECT ON public.profiles FROM anon;

-- Add explicit comment documenting the security model
COMMENT ON TABLE public.profiles IS 'Employee profile data. RLS enabled. All access requires authentication via auth.uid().';