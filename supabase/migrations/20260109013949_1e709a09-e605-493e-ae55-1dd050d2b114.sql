-- Create subscription status and tier enums
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'expired');
CREATE TYPE subscription_tier AS ENUM ('basic', 'pro');

-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status subscription_status NOT NULL DEFAULT 'trial',
  tier subscription_tier NOT NULL DEFAULT 'basic',
  users_limit INTEGER NOT NULL DEFAULT 100,
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Platform owners can manage all subscriptions
CREATE POLICY "Platform owners can manage subscriptions"
  ON subscriptions
  FOR ALL
  USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Org members can view their own subscription
CREATE POLICY "Org members can view their subscription"
  ON subscriptions
  FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default subscriptions for existing organizations
INSERT INTO subscriptions (organization_id, status, tier, users_limit)
SELECT id, 'active'::subscription_status, 'pro'::subscription_tier, 999
FROM organizations
ON CONFLICT (organization_id) DO NOTHING;