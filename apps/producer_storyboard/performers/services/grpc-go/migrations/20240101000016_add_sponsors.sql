-- Sponsor Management Tables

-- Sponsors table
CREATE TABLE IF NOT EXISTS sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES storyboard_projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website VARCHAR(500),
    address TEXT,
    budget_min DECIMAL(12,2),
    budget_max DECIMAL(12,2),
    preferences_json JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'contacted', 'negotiating', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sponsor history table
CREATE TABLE IF NOT EXISTS sponsor_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('contact', 'meeting', 'proposal', 'response', 'status_change')),
    event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sponsor contacts table
CREATE TABLE IF NOT EXISTS sponsor_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sponsor posts table (organization posts)
CREATE TABLE IF NOT EXISTS sponsor_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id VARCHAR(255) NOT NULL,
    sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    visibility VARCHAR(50) NOT NULL DEFAULT 'org' CHECK (visibility IN ('public', 'org', 'private')),
    posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sponsors_org_id ON sponsors(org_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_project_id ON sponsors(project_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_status ON sponsors(status);
CREATE INDEX IF NOT EXISTS idx_sponsors_industry ON sponsors(industry);
CREATE INDEX IF NOT EXISTS idx_sponsors_created_at ON sponsors(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sponsor_history_sponsor_id ON sponsor_history(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_history_event_date ON sponsor_history(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_sponsor_history_event_type ON sponsor_history(event_type);

CREATE INDEX IF NOT EXISTS idx_sponsor_contacts_sponsor_id ON sponsor_contacts(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_contacts_is_primary ON sponsor_contacts(sponsor_id, is_primary) WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_sponsor_posts_org_id ON sponsor_posts(org_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_posts_sponsor_id ON sponsor_posts(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_posts_visibility ON sponsor_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_sponsor_posts_posted_at ON sponsor_posts(posted_at DESC);

-- Comments
COMMENT ON TABLE sponsors IS 'Sponsor information with budget, preferences, and status tracking';
COMMENT ON TABLE sponsor_history IS 'History of events and interactions with sponsors';
COMMENT ON TABLE sponsor_contacts IS 'Contact persons associated with sponsors';
COMMENT ON TABLE sponsor_posts IS 'Organization posts about sponsors for sharing and collaboration';
