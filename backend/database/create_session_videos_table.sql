-- Create session_videos table to store video recordings linked to sessions
-- This table links videos to sessions via session_id foreign key

CREATE TABLE IF NOT EXISTS session_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL, -- URL to video file (stored in Supabase Storage)
    video_format TEXT DEFAULT 'mp4', -- 'mp4', 'mov', etc.
    duration INTEGER, -- milliseconds
    file_size BIGINT, -- bytes
    thumbnail_url TEXT, -- Optional: thumbnail image URL
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_videos_session_id ON session_videos(session_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON session_videos(created_at DESC);

-- Add comment
COMMENT ON TABLE session_videos IS 'Stores video recordings linked to sessions. Videos are stored in Supabase Storage, only URLs are stored here.';

