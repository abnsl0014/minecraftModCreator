-- Migration 002: Token system for usage tracking and monetization
-- Run this in Supabase SQL Editor

-- User profiles with token balance
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token_balance INT NOT NULL DEFAULT 5,
  tier TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Token transaction log
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id
  ON token_transactions(user_id, created_at DESC);

-- RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Service role can do everything (backend uses service key)
CREATE POLICY "Service role full access on profiles"
  ON user_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Users can read their own transactions
CREATE POLICY "Users can read own transactions"
  ON token_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access on transactions"
  ON token_transactions FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-create profile when a user signs up
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, token_balance, tier)
  VALUES (NEW.id, 5, 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- Create profiles for any existing users who don't have one yet
INSERT INTO user_profiles (id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;
