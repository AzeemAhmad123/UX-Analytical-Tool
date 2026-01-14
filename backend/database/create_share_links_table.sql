-- Create funnel_share_links table for shareable funnel reports
CREATE TABLE IF NOT EXISTS funnel_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  share_token VARCHAR(255) NOT NULL UNIQUE,
  share_url TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  max_views INTEGER, -- NULL means unlimited
  is_active BOOLEAN DEFAULT TRUE,
  password_hash TEXT, -- Optional password protection
  share_params JSONB, -- Store filter parameters (date range, platform, etc.)
  created_by UUID, -- User who created the share link
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_funnel_share_links_funnel_id ON funnel_share_links(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_share_links_project_id ON funnel_share_links(project_id);
CREATE INDEX IF NOT EXISTS idx_funnel_share_links_token ON funnel_share_links(share_token);
CREATE INDEX IF NOT EXISTS idx_funnel_share_links_active ON funnel_share_links(is_active);

-- Create share_link_views table to track views
CREATE TABLE IF NOT EXISTS funnel_share_link_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id UUID NOT NULL REFERENCES funnel_share_links(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  referer TEXT
);

CREATE INDEX IF NOT EXISTS idx_funnel_share_link_views_share_link_id ON funnel_share_link_views(share_link_id);
CREATE INDEX IF NOT EXISTS idx_funnel_share_link_views_viewed_at ON funnel_share_link_views(viewed_at);

