-- ============================================
-- Minecraft Mod Creator - Supabase Schema
-- Run these queries in Supabase SQL Editor
-- ============================================

-- 1. Jobs table - tracks mod generation requests
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'parsing', 'generating', 'compiling', 'fixing', 'complete', 'failed')),
    description TEXT NOT NULL,
    mod_name TEXT,
    mod_id TEXT,
    author_name TEXT DEFAULT 'ModCreator User',
    mod_spec JSONB,
    progress_message TEXT DEFAULT 'Queued...',
    iteration INTEGER DEFAULT 0,
    max_iterations INTEGER DEFAULT 3,
    jar_file_path TEXT,
    jar_file_url TEXT,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_status ON jobs(status);

-- 3. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- 5. Public access policies (MVP - add auth later)
CREATE POLICY "Allow public read" ON jobs FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON jobs FOR UPDATE USING (true);

-- 6. Migration: Add edition and generated_files columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS edition TEXT DEFAULT 'java' CHECK (edition IN ('java', 'bedrock'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS generated_files JSONB DEFAULT '{}';

-- 7. Migration: Add texture_previews column and update status check
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS texture_previews JSONB;
-- Update status constraint to include 'packaging' and remove 'compiling'/'fixing'
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
    CHECK (status IN ('queued', 'parsing', 'generating', 'packaging', 'compiling', 'fixing', 'complete', 'failed'));

-- 8. Storage bucket for .jar files
-- Run this OR create via Dashboard > Storage > New Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('mod-jars', 'mod-jars', true, 52428800);

-- Storage policies
CREATE POLICY "Public read mod-jars" ON storage.objects
    FOR SELECT USING (bucket_id = 'mod-jars');

CREATE POLICY "Service upload mod-jars" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'mod-jars');
