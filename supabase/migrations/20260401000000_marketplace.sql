-- supabase/migration-004-marketplace.sql
-- Marketplace: submissions, download tracking, admin support

-- 1. Mod submissions table
CREATE TABLE mod_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    job_id UUID REFERENCES jobs(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    edition TEXT NOT NULL CHECK (edition IN ('java', 'bedrock')),
    category TEXT NOT NULL CHECK (category IN ('weapon', 'tool', 'armor', 'food', 'block', 'ability')),
    tags TEXT[] DEFAULT '{}',
    screenshots TEXT[] DEFAULT '{}',
    video_url TEXT,
    download_url TEXT NOT NULL,
    crafting_recipe JSONB,
    survival_guide TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    download_count INT NOT NULL DEFAULT 0,
    featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_user_id ON mod_submissions(user_id);
CREATE INDEX idx_submissions_status ON mod_submissions(status);
CREATE INDEX idx_submissions_featured ON mod_submissions(featured) WHERE featured = true;

-- Auto-update updated_at (reuse existing function)
CREATE TRIGGER update_submissions_updated_at
    BEFORE UPDATE ON mod_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE mod_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved submissions" ON mod_submissions
    FOR SELECT USING (status = 'approved' OR user_id = auth.uid());
CREATE POLICY "Authenticated insert submissions" ON mod_submissions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Owner update submissions" ON mod_submissions
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete submissions" ON mod_submissions
    FOR DELETE USING (user_id = auth.uid());

-- 2. Download events table
CREATE TABLE download_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES mod_submissions(id) ON DELETE CASCADE,
    downloader_ip TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_download_events_submission ON download_events(submission_id);
CREATE INDEX idx_download_events_dedup ON download_events(submission_id, downloader_ip, created_at);

ALTER TABLE download_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only for download_events" ON download_events
    FOR ALL USING (true);

-- 3. Add columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS earnings_balance INT NOT NULL DEFAULT 0;

-- 4. Screenshots storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('mod-screenshots', 'mod-screenshots', true, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read mod-screenshots" ON storage.objects
    FOR SELECT USING (bucket_id = 'mod-screenshots');

CREATE POLICY "Authenticated upload mod-screenshots" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'mod-screenshots' AND auth.uid() IS NOT NULL);
