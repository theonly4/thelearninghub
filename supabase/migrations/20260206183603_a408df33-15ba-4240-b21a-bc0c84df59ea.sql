-- Add mfa_method column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mfa_method TEXT CHECK (mfa_method IN ('totp', 'email')) DEFAULT NULL;

-- Create mfa_email_codes table for storing hashed verification codes
CREATE TABLE public.mfa_email_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_mfa_email_codes_user_id ON public.mfa_email_codes(user_id);

-- Index for cleanup of expired codes
CREATE INDEX idx_mfa_email_codes_expires ON public.mfa_email_codes(expires_at);

-- Enable RLS - only accessible via service role (edge functions)
ALTER TABLE public.mfa_email_codes ENABLE ROW LEVEL SECURITY;

-- Create mfa_email_sessions table for tracking verified email MFA sessions
CREATE TABLE public.mfa_email_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, session_id)
);

-- Index for fast session lookups
CREATE INDEX idx_mfa_email_sessions_lookup ON public.mfa_email_sessions(user_id, session_id);

-- Enable RLS
ALTER TABLE public.mfa_email_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own sessions
CREATE POLICY "Users can read own sessions" ON public.mfa_email_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);