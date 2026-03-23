-- Add model_used column to track which AI model generated the mod
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS model_used TEXT DEFAULT 'gpt-oss-120b';

-- Add user_id for auth (nullable for existing rows)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs (user_id);

-- Update RLS policies for auth
DROP POLICY IF EXISTS "Allow public read" ON jobs;
DROP POLICY IF EXISTS "Allow public insert" ON jobs;
DROP POLICY IF EXISTS "Allow public update" ON jobs;

-- Anyone can browse gallery (public reads)
CREATE POLICY "Allow public read" ON jobs FOR SELECT USING (true);

-- Authenticated users can create jobs
CREATE POLICY "Allow authenticated insert" ON jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own jobs
CREATE POLICY "Allow owner update" ON jobs
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can do anything (backend uses service key)
CREATE POLICY "Allow service role all" ON jobs
    FOR ALL USING (auth.role() = 'service_role');
