-- Create table to track which questions were released to which organizations
CREATE TABLE public.question_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  released_by UUID NOT NULL,
  released_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate releases of same question to same org
  UNIQUE(question_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.question_releases ENABLE ROW LEVEL SECURITY;

-- Platform owners can manage all question releases
CREATE POLICY "Platform owners can manage question releases"
ON public.question_releases
FOR ALL
USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Org admins can view their organization's question releases
CREATE POLICY "Org admins can view their question releases"
ON public.question_releases
FOR SELECT
USING (has_role(auth.uid(), 'org_admin'::app_role) AND organization_id = get_user_organization(auth.uid()));

-- Add indexes for performance
CREATE INDEX idx_question_releases_org ON public.question_releases(organization_id);
CREATE INDEX idx_question_releases_question ON public.question_releases(question_id);
CREATE INDEX idx_question_releases_released_at ON public.question_releases(released_at DESC);