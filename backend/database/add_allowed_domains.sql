-- Add allowed_domains column to projects table
-- This stores the list of domains where the SDK key can be used
-- Format: JSON array of strings, e.g., ["example.com", "www.example.com"]

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS allowed_domains TEXT;

-- Add comment
COMMENT ON COLUMN projects.allowed_domains IS 'JSON array of allowed domains for this SDK key. First domain is auto-approved on first use.';

