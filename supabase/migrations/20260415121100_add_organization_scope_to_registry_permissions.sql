-- Add organization_id to registry_permissions for organization-scoped access
-- This allows organizations to grant access to registries for all their members

-- Add organization_id column (nullable for backward compatibility)
ALTER TABLE registry_permissions
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for organization lookups
CREATE INDEX IF NOT EXISTS idx_registry_permissions_org ON registry_permissions(organization_id);

-- Add comment
COMMENT ON COLUMN registry_permissions.organization_id IS 'Optional organization scope. If set, all members of this organization have access to the registry.';

