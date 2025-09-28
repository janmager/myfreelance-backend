-- Migration: Create valuations table

CREATE TABLE IF NOT EXISTS valuations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(client_id) ON DELETE SET NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'PLN',
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_valuations_user_id ON valuations(user_id);
CREATE INDEX IF NOT EXISTS idx_valuations_client_id ON valuations(client_id);
CREATE INDEX IF NOT EXISTS idx_valuations_project_id ON valuations(project_id);
CREATE INDEX IF NOT EXISTS idx_valuations_status ON valuations(status);
CREATE INDEX IF NOT EXISTS idx_valuations_created_at ON valuations(created_at);
CREATE INDEX IF NOT EXISTS idx_valuations_valid_until ON valuations(valid_until);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_valuations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_valuations_updated_at
    BEFORE UPDATE ON valuations
    FOR EACH ROW
    EXECUTE FUNCTION update_valuations_updated_at();
