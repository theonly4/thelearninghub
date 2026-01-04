-- Create table for question packages (sets of 25 questions per workforce group)
CREATE TABLE public.question_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  workforce_group public.workforce_group NOT NULL,
  sequence_number INTEGER NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(workforce_group, sequence_number)
);

-- Junction table linking packages to their questions
CREATE TABLE public.package_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.question_packages(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(package_id, question_id)
);

-- Track which packages have been released to which organizations
CREATE TABLE public.package_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.question_packages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workforce_group public.workforce_group NOT NULL,
  training_year INTEGER NOT NULL,
  released_by UUID NOT NULL,
  released_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(package_id, organization_id),
  UNIQUE(organization_id, workforce_group, training_year)
);

-- Add indexes
CREATE INDEX idx_package_releases_org ON public.package_releases(organization_id);
CREATE INDEX idx_package_releases_package ON public.package_releases(package_id);
CREATE INDEX idx_package_questions_package ON public.package_questions(package_id);
CREATE INDEX idx_package_questions_question ON public.package_questions(question_id);
CREATE INDEX idx_question_packages_workforce ON public.question_packages(workforce_group);

-- Enable RLS
ALTER TABLE public.question_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_releases ENABLE ROW LEVEL SECURITY;

-- Platform owners can manage all
CREATE POLICY "Platform owners can manage question packages"
ON public.question_packages FOR ALL
USING (has_role(auth.uid(), 'platform_owner'::app_role));

CREATE POLICY "Platform owners can manage package questions"
ON public.package_questions FOR ALL
USING (has_role(auth.uid(), 'platform_owner'::app_role));

CREATE POLICY "Platform owners can manage package releases"
ON public.package_releases FOR ALL
USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Org admins can view their releases
CREATE POLICY "Org admins can view their package releases"
ON public.package_releases FOR SELECT
USING (has_role(auth.uid(), 'org_admin'::app_role) AND organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Org admins can view released packages"
ON public.question_packages FOR SELECT
USING (
  has_role(auth.uid(), 'org_admin'::app_role) 
  AND id IN (SELECT package_id FROM public.package_releases WHERE organization_id = get_user_organization(auth.uid()))
);

CREATE POLICY "Org admins can view released package questions"
ON public.package_questions FOR SELECT
USING (
  has_role(auth.uid(), 'org_admin'::app_role)
  AND package_id IN (SELECT package_id FROM public.package_releases WHERE organization_id = get_user_organization(auth.uid()))
);

-- Trigger for updated_at
CREATE TRIGGER update_question_packages_updated_at
BEFORE UPDATE ON public.question_packages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();