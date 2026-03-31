-- Migration 003: Subscription support for DodoPayments
-- Run this in Supabase SQL Editor

-- Add subscription columns to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS billing_period TEXT,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Index for looking up users by subscription_id (webhook handler)
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_id
  ON user_profiles(subscription_id)
  WHERE subscription_id IS NOT NULL;

-- RPC function: look up user_id by email (used by webhook handler)
CREATE OR REPLACE FUNCTION get_user_id_by_email(lookup_email TEXT)
RETURNS UUID AS $$
  SELECT id FROM auth.users WHERE email = lookup_email LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
