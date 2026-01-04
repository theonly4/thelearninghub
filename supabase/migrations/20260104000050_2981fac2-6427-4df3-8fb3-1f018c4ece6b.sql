-- Create hipaa_topics table for HIPAA metadata (platform owner use only)
CREATE TABLE public.hipaa_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  topic_name text NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add unique constraint on rule_name + topic_name combination
ALTER TABLE public.hipaa_topics 
ADD CONSTRAINT hipaa_topics_rule_topic_unique UNIQUE (rule_name, topic_name);

-- Add hipaa_topic_id foreign key to quiz_questions
ALTER TABLE public.quiz_questions 
ADD COLUMN hipaa_topic_id uuid REFERENCES public.hipaa_topics(id);

-- Enable RLS on hipaa_topics
ALTER TABLE public.hipaa_topics ENABLE ROW LEVEL SECURITY;

-- Platform owners can manage hipaa_topics
CREATE POLICY "Platform owners can manage hipaa topics"
ON public.hipaa_topics
FOR ALL
USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Authenticated users can view hipaa_topics (needed for joins)
CREATE POLICY "Authenticated users can view hipaa topics"
ON public.hipaa_topics
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_hipaa_topics_updated_at
BEFORE UPDATE ON public.hipaa_topics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();