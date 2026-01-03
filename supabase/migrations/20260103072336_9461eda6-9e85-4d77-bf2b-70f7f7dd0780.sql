-- Create content_releases table to track what content is released to which organization
CREATE TABLE public.content_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('quiz', 'training_material')),
    content_id UUID NOT NULL,
    released_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    released_by UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, content_type, content_id)
);

-- Enable RLS
ALTER TABLE public.content_releases ENABLE ROW LEVEL SECURITY;

-- Platform owners can manage all content releases
CREATE POLICY "Platform owners can manage content releases"
ON public.content_releases
FOR ALL
USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Org admins can view releases for their organization
CREATE POLICY "Org admins can view their content releases"
ON public.content_releases
FOR SELECT
USING (
    has_role(auth.uid(), 'org_admin'::app_role) 
    AND organization_id = get_user_organization(auth.uid())
);

-- Platform owners can manage quizzes
CREATE POLICY "Platform owners can manage quizzes"
ON public.quizzes
FOR ALL
USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Platform owners can manage quiz questions
CREATE POLICY "Platform owners can manage quiz questions"
ON public.quiz_questions
FOR ALL
USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Platform owners can manage training materials
CREATE POLICY "Platform owners can manage training materials"
ON public.training_materials
FOR ALL
USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Platform owners can view all organizations
CREATE POLICY "Platform owners can view all organizations"
ON public.organizations
FOR SELECT
USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Platform owners can view all profiles (for analytics)
CREATE POLICY "Platform owners can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Platform owners can view all audit logs
CREATE POLICY "Platform owners can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Create indexes for faster lookups
CREATE INDEX idx_content_releases_org ON public.content_releases(organization_id);
CREATE INDEX idx_content_releases_content ON public.content_releases(content_type, content_id);