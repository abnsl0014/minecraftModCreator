-- Security hardening: webhook dedup table, constraints, FKs, RLS, indexes

-- Webhook events deduplication
CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON webhook_events;

CREATE POLICY "Service role only" ON webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- CHECK constraints
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS check_token_balance_non_negative;

ALTER TABLE user_profiles ADD CONSTRAINT check_token_balance_non_negative CHECK (token_balance >= 0);

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS check_subscription_status_valid;

ALTER TABLE user_profiles ADD CONSTRAINT check_subscription_status_valid CHECK (subscription_status IN ('none', 'active', 'cancelled', 'past_due', 'failed'));

-- FK cascade fixes
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_user_id_fkey;

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS fk_jobs_user_id;

ALTER TABLE jobs ADD CONSTRAINT fk_jobs_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE mod_submissions DROP CONSTRAINT IF EXISTS mod_submissions_job_id_fkey;

ALTER TABLE mod_submissions DROP CONSTRAINT IF EXISTS fk_mod_submissions_job_id;

ALTER TABLE mod_submissions ADD CONSTRAINT fk_mod_submissions_job_id FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;

-- RLS policies
DROP POLICY IF EXISTS "Service role only for download_events" ON download_events;

CREATE POLICY "Service role only for download_events" ON download_events
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated insert submissions" ON mod_submissions;

CREATE POLICY "Authenticated insert submissions" ON mod_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on submissions" ON mod_submissions;

CREATE POLICY "Service role full access on submissions" ON mod_submissions
    FOR ALL USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_user_id_status ON jobs(user_id, status);

CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON mod_submissions(user_id);

CREATE INDEX IF NOT EXISTS idx_download_events_dedup ON download_events(submission_id, downloader_ip, created_at);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed_at);
