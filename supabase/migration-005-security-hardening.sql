-- Migration 005: Security hardening
-- Atomic RPCs, webhook dedup, CHECK constraints, FK cascades, RLS fixes, indexes
-- Run this in Supabase SQL Editor. Safe to run multiple times (idempotent).

-- ============================================
-- 1. Atomic token deduction RPC
-- ============================================
CREATE OR REPLACE FUNCTION atomic_deduct_tokens(
    p_user_id UUID,
    p_amount INT,
    p_reason TEXT
) RETURNS INT AS $$
DECLARE
    v_new_balance INT;
BEGIN
    UPDATE user_profiles
       SET token_balance = token_balance - p_amount
     WHERE id = p_user_id
       AND token_balance >= p_amount
    RETURNING token_balance INTO v_new_balance;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient tokens';
    END IF;

    INSERT INTO token_transactions (user_id, amount, reason)
    VALUES (p_user_id, -p_amount, p_reason);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Atomic increment download count RPC
-- ============================================
CREATE OR REPLACE FUNCTION atomic_increment_download(
    p_submission_id UUID,
    p_earnings_per_download INT
) RETURNS INT AS $$
DECLARE
    v_new_count INT;
    v_owner_id UUID;
BEGIN
    UPDATE mod_submissions
       SET download_count = download_count + 1
     WHERE id = p_submission_id
    RETURNING download_count, user_id INTO v_new_count, v_owner_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Submission not found';
    END IF;

    UPDATE user_profiles
       SET earnings_balance = earnings_balance + p_earnings_per_download
     WHERE id = v_owner_id;

    RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Webhook events deduplication table
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy to be idempotent
DROP POLICY IF EXISTS "Service role only" ON webhook_events;
CREATE POLICY "Service role only" ON webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 4. CHECK constraints (idempotent via DO blocks)
-- ============================================
DO $$ BEGIN
    ALTER TABLE user_profiles
        ADD CONSTRAINT check_token_balance_non_negative CHECK (token_balance >= 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE user_profiles
        ADD CONSTRAINT check_subscription_status_valid
        CHECK (subscription_status IN ('none', 'active', 'cancelled', 'past_due', 'failed'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 5. Foreign key CASCADE fixes
-- ============================================

-- jobs.user_id -> ON DELETE SET NULL
DO $$ BEGIN
    -- Check if the current FK exists without ON DELETE SET NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'jobs'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND ccu.column_name = 'id'
          AND ccu.table_schema = 'auth'
          AND ccu.table_name = 'users'
    ) THEN
        -- Find and drop the existing FK constraint on jobs.user_id
        EXECUTE (
            SELECT 'ALTER TABLE jobs DROP CONSTRAINT ' || quote_ident(tc.constraint_name)
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'jobs'
              AND tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name = 'user_id'
            LIMIT 1
        );
    END IF;

    -- Recreate with ON DELETE SET NULL
    ALTER TABLE jobs
        ADD CONSTRAINT fk_jobs_user_id
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- mod_submissions.job_id -> ON DELETE SET NULL
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'mod_submissions'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'job_id'
    ) THEN
        EXECUTE (
            SELECT 'ALTER TABLE mod_submissions DROP CONSTRAINT ' || quote_ident(tc.constraint_name)
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'mod_submissions'
              AND tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name = 'job_id'
            LIMIT 1
        );
    END IF;

    ALTER TABLE mod_submissions
        ADD CONSTRAINT fk_mod_submissions_job_id
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 6. Fix RLS policies
-- ============================================

-- Fix download_events: replace overly permissive USING(true) with service_role only
DROP POLICY IF EXISTS "Service role only for download_events" ON download_events;
CREATE POLICY "Service role only for download_events" ON download_events
    FOR ALL USING (auth.role() = 'service_role');

-- Fix mod_submissions INSERT: ensure users can only insert their own submissions
DROP POLICY IF EXISTS "Authenticated insert submissions" ON mod_submissions;
CREATE POLICY "Authenticated insert submissions" ON mod_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role bypass for mod_submissions (backend operations)
DROP POLICY IF EXISTS "Service role full access on submissions" ON mod_submissions;
CREATE POLICY "Service role full access on submissions" ON mod_submissions
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 7. Missing indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_jobs_user_id_status ON jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON mod_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_download_events_dedup ON download_events(submission_id, downloader_ip, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed_at);
