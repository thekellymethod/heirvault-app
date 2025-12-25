-- Add registry_permissions table for access control
-- This table controls which attorneys can access which registry records

CREATE TABLE IF NOT EXISTS registry_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id UUID NOT NULL REFERENCES registry_records(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user ID
  role TEXT NOT NULL DEFAULT 'ATTORNEY', -- Role: ADMIN, ATTORNEY, SYSTEM
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(registry_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_registry_permissions_user ON registry_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_registry_permissions_registry ON registry_permissions(registry_id);
CREATE INDEX IF NOT EXISTS idx_registry_permissions_created ON registry_permissions(createdAt);

-- Add comment
COMMENT ON TABLE registry_permissions IS 'Controls attorney access to registry records. Attorneys can only see registries they have been granted access to via this table.';

