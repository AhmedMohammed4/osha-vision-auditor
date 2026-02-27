-- OSHA Vision Auditor — Supabase Schema
-- Run this in the Supabase SQL editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Videos table: tracks uploaded and processed videos
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded',  -- uploaded | processing | completed | failed
    risk_score FLOAT,
    report TEXT,
    video_url TEXT,
    duration FLOAT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Violations table: individual OSHA violations detected per frame
CREATE TABLE IF NOT EXISTS violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    timestamp FLOAT NOT NULL,
    violation_type TEXT NOT NULL,  -- helmet_violation | vest_violation
    confidence FLOAT NOT NULL,
    frame_url TEXT
);

-- Frames table: sampled frames stored for reference
CREATE TABLE IF NOT EXISTS frames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    timestamp FLOAT NOT NULL,
    image_url TEXT NOT NULL
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_violations_video_id ON violations(video_id);
CREATE INDEX IF NOT EXISTS idx_violations_timestamp ON violations(timestamp);
CREATE INDEX IF NOT EXISTS idx_frames_video_id ON frames(video_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);

-- Row Level Security (disable for service role usage in backend)
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE frames ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by backend)
CREATE POLICY "Service role full access on videos"
    ON videos FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on violations"
    ON violations FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on frames"
    ON frames FOR ALL
    USING (true)
    WITH CHECK (true);
