-- Create training_assignments table for admin-to-employee training assignments with deadlines
CREATE TABLE public.training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  assigned_to UUID NOT NULL, -- employee user_id
  assigned_by UUID NOT NULL, -- admin user_id
  workforce_group workforce_group NOT NULL,
  due_date TIMESTAMPTZ NOT NULL, -- Admin-set completion deadline
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;

-- Platform owners can view all assignments
CREATE POLICY "Platform owners can view all training assignments"
ON public.training_assignments
FOR SELECT
USING (has_role(auth.uid(), 'platform_owner'));

-- Org admins can manage assignments in their organization
CREATE POLICY "Org admins can manage training assignments"
ON public.training_assignments
FOR ALL
USING (
  has_role(auth.uid(), 'org_admin') 
  AND organization_id = get_user_organization(auth.uid())
);

-- Employees can view their own assignments
CREATE POLICY "Users can view their own training assignments"
ON public.training_assignments
FOR SELECT
USING (assigned_to = auth.uid());

-- Employees can update their own assignment status (for progress tracking)
CREATE POLICY "Users can update their own assignment status"
ON public.training_assignments
FOR UPDATE
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_training_assignments_updated_at
BEFORE UPDATE ON public.training_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_training_assignments_org ON public.training_assignments(organization_id);
CREATE INDEX idx_training_assignments_assigned_to ON public.training_assignments(assigned_to);
CREATE INDEX idx_training_assignments_due_date ON public.training_assignments(due_date);
CREATE INDEX idx_training_assignments_status ON public.training_assignments(status);