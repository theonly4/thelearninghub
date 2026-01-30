-- Drop the incorrectly named/configured policy if it exists
DROP POLICY IF EXISTS "Authenticated users can view quizzes" ON public.organizations;

-- The existing policies should be sufficient:
-- "Platform owners can view all organizations" - allows platform owners to see all orgs
-- "Users can view their own organization" - allows users to see only their org

-- Verify the correct policies are in place by recreating them with proper restrictive settings
DROP POLICY IF EXISTS "Platform owners can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;

-- Recreate the policies with explicit TO clause for better security
CREATE POLICY "Platform owners can view all organizations" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'platform_owner'::app_role));

CREATE POLICY "Users can view their own organization" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (id = get_user_organization(auth.uid()));