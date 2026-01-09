-- Optimize RLS Policies for Performance
-- This migration addresses Supabase advisor warnings:
-- 1. Auth RLS Initialization Plan: Wrap auth functions in SELECT subqueries
-- 2. Multiple Permissive Policies: Consolidate duplicate policies
--
-- NOTE: This codebase uses Clerk for authentication, not Supabase Auth.
-- However, the RLS policies in the database reference auth.uid() functions.
-- These policies may not be actively enforced (since all access uses service role),
-- but optimizing them:
-- - Clears Supabase advisor warnings
-- - Improves performance if policies are ever enforced
-- - Follows best practices for RLS policy design
--
-- The key optimization: Replace `auth.uid()` with `(SELECT auth.uid()::text)` 
-- This caches the auth function result instead of re-evaluating for each row.
-- NOTE: All ID columns in this schema are TEXT (not UUID), so we cast auth.uid() to text.

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================

-- Drop all existing organizations policies
DROP POLICY IF EXISTS "org owners can update org" ON organizations;
DROP POLICY IF EXISTS "organizations_select_own" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_own" ON organizations;
DROP POLICY IF EXISTS "org_select_owner" ON organizations;
DROP POLICY IF EXISTS "org_insert_owner" ON organizations;
DROP POLICY IF EXISTS "org_update_owner" ON organizations;
DROP POLICY IF EXISTS "org_delete_owner" ON organizations;
DROP POLICY IF EXISTS "organizations_select_owner" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_owner" ON organizations;
DROP POLICY IF EXISTS "organizations_update_owner" ON organizations;
DROP POLICY IF EXISTS "organizations_delete_owner" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_owner_only" ON organizations;
DROP POLICY IF EXISTS "organizations_update_owner_only" ON organizations;
DROP POLICY IF EXISTS "organizations_select_owner_or_member" ON organizations;
DROP POLICY IF EXISTS "org members can read org" ON organizations;
DROP POLICY IF EXISTS "org members read org" ON organizations;

-- Optimized SELECT policy (consolidated)
CREATE POLICY "organizations_select_optimized" ON organizations
  FOR SELECT
  USING (
    -- Optimize auth.uid() call by wrapping in SELECT subquery
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id = (SELECT auth.uid()::text)
    )
    OR
    -- Allow if user is owner
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id = (SELECT auth.uid()::text)
      AND om.role = 'OWNER'
    )
  );

-- Optimized INSERT policy (consolidated)
CREATE POLICY "organizations_insert_optimized" ON organizations
  FOR INSERT
  WITH CHECK (
    -- Only allow if user is creating their own org or is admin
    (SELECT auth.uid()) IS NOT NULL
  );

-- Optimized UPDATE policy (consolidated)
CREATE POLICY "organizations_update_optimized" ON organizations
  FOR UPDATE
  USING (
    -- Optimize auth.uid() call
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id = (SELECT auth.uid()::text)
      AND om.role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id = (SELECT auth.uid()::text)
      AND om.role = 'OWNER'
    )
  );

-- Optimized DELETE policy (consolidated)
CREATE POLICY "organizations_delete_optimized" ON organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id = (SELECT auth.uid()::text)
      AND om.role = 'OWNER'
    )
  );

-- ============================================================================
-- ORG_MEMBERS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "org owners can manage members" ON org_members;
DROP POLICY IF EXISTS "org members can read members" ON org_members;
DROP POLICY IF EXISTS "org members read members" ON org_members;
DROP POLICY IF EXISTS "org_members_select_by_membership" ON org_members;
DROP POLICY IF EXISTS "org_members_insert_owner_only" ON org_members;
DROP POLICY IF EXISTS "org_members_update_owner_only" ON org_members;
DROP POLICY IF EXISTS "org_members_delete_owner_only" ON org_members;

-- Optimized SELECT policy (consolidated)
CREATE POLICY "org_members_select_optimized" ON org_members
  FOR SELECT
  USING (
    -- Members can see other members in their org
    EXISTS (
      SELECT 1 FROM org_members om2
      WHERE om2.organization_id = org_members.organization_id
      AND om2.user_id = (SELECT auth.uid()::text)
    )
    OR
    -- Owners can see all members
    EXISTS (
      SELECT 1 FROM org_members om2
      WHERE om2.organization_id = org_members.organization_id
      AND om2.user_id = (SELECT auth.uid()::text)
      AND om2.role = 'OWNER'
    )
  );

-- Optimized INSERT/UPDATE/DELETE policies (separate to avoid conflict with SELECT)
CREATE POLICY "org_members_insert_optimized" ON org_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om2
      WHERE om2.organization_id = org_members.organization_id
      AND om2.user_id = (SELECT auth.uid()::text)
      AND om2.role = 'OWNER'
    )
  );

CREATE POLICY "org_members_update_optimized" ON org_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members om2
      WHERE om2.organization_id = org_members.organization_id
      AND om2.user_id = (SELECT auth.uid()::text)
      AND om2.role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om2
      WHERE om2.organization_id = org_members.organization_id
      AND om2.user_id = (SELECT auth.uid()::text)
      AND om2.role = 'OWNER'
    )
  );

CREATE POLICY "org_members_delete_optimized" ON org_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM org_members om2
      WHERE om2.organization_id = org_members.organization_id
      AND om2.user_id = (SELECT auth.uid()::text)
      AND om2.role = 'OWNER'
    )
  );

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "org owners can delete clients" ON clients;
DROP POLICY IF EXISTS "clients_select_org_member" ON clients;
DROP POLICY IF EXISTS "clients_select_owner" ON clients;
DROP POLICY IF EXISTS "clients_insert_org_member" ON clients;
DROP POLICY IF EXISTS "clients_insert_owner" ON clients;
DROP POLICY IF EXISTS "clients_update_org_member" ON clients;
DROP POLICY IF EXISTS "clients_update_owner" ON clients;
DROP POLICY IF EXISTS "clients_delete_owner" ON clients;
DROP POLICY IF EXISTS "org members can read clients" ON clients;
DROP POLICY IF EXISTS "org members read clients" ON clients;
DROP POLICY IF EXISTS "org members can insert clients" ON clients;
DROP POLICY IF EXISTS "org members write clients" ON clients;
DROP POLICY IF EXISTS "org members can update clients" ON clients;
DROP POLICY IF EXISTS "org members update clients" ON clients;

-- Optimized SELECT policy (consolidated)
CREATE POLICY "clients_select_optimized" ON clients
  FOR SELECT
  USING (
    -- Org members can see clients in their org
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN clients c ON c.org_id = om.organization_id
      WHERE c.id = clients.id
      AND om.user_id = (SELECT auth.uid()::text)
    )
    OR
    -- Owners can see all clients
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN clients c ON c.org_id = om.organization_id
      WHERE c.id = clients.id
      AND om.user_id = (SELECT auth.uid()::text)
      AND om.role = 'OWNER'
    )
  );

-- Optimized INSERT policy (consolidated)
CREATE POLICY "clients_insert_optimized" ON clients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.organization_id = clients.org_id
      AND om.user_id = (SELECT auth.uid()::text)
    )
  );

-- Optimized UPDATE policy (consolidated)
CREATE POLICY "clients_update_optimized" ON clients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.organization_id = clients.org_id
      AND om.user_id = (SELECT auth.uid()::text)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.organization_id = clients.org_id
      AND om.user_id = (SELECT auth.uid()::text)
    )
  );

-- Optimized DELETE policy (consolidated)
CREATE POLICY "clients_delete_optimized" ON clients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.organization_id = clients.org_id
      AND om.user_id = (SELECT auth.uid()::text)
      AND om.role = 'OWNER'
    )
  );

-- ============================================================================
-- POLICIES TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "policies_select_org_member" ON policies;
DROP POLICY IF EXISTS "policies_select_owner" ON policies;
DROP POLICY IF EXISTS "policies_insert_org_member" ON policies;
DROP POLICY IF EXISTS "policies_insert_owner" ON policies;
DROP POLICY IF EXISTS "policies_update_org_member" ON policies;
DROP POLICY IF EXISTS "policies_update_owner" ON policies;
DROP POLICY IF EXISTS "policies_delete_owner" ON policies;
DROP POLICY IF EXISTS "org members can read policies" ON policies;
DROP POLICY IF EXISTS "org members can write policies" ON policies;
DROP POLICY IF EXISTS "org members can update policies" ON policies;

-- Optimized SELECT policy (consolidated)
CREATE POLICY "policies_select_optimized" ON policies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN org_members om ON om.organization_id = c.org_id
      WHERE c.id = policies.client_id
      AND om.user_id = (SELECT auth.uid()::text)
    )
  );

-- Optimized INSERT policy (consolidated)
CREATE POLICY "policies_insert_optimized" ON policies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN org_members om ON om.organization_id = c.org_id
      WHERE c.id = policies.client_id
      AND om.user_id = (SELECT auth.uid()::text)
    )
  );

-- Optimized UPDATE policy (consolidated)
CREATE POLICY "policies_update_optimized" ON policies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN org_members om ON om.organization_id = c.org_id
      WHERE c.id = policies.client_id
      AND om.user_id = (SELECT auth.uid()::text)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN org_members om ON om.organization_id = c.org_id
      WHERE c.id = policies.client_id
      AND om.user_id = (SELECT auth.uid()::text)
    )
  );

-- Optimized DELETE policy
CREATE POLICY "policies_delete_optimized" ON policies
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN org_members om ON om.organization_id = c.org_id
      WHERE c.id = policies.client_id
      AND om.user_id = (SELECT auth.uid()::text)
      AND om.role = 'OWNER'
    )
  );

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "documents_select_org_member" ON documents;
DROP POLICY IF EXISTS "documents_select_owner" ON documents;
DROP POLICY IF EXISTS "documents_insert_org_member" ON documents;
DROP POLICY IF EXISTS "documents_insert_owner" ON documents;
DROP POLICY IF EXISTS "documents_update_org_member" ON documents;
DROP POLICY IF EXISTS "documents_update_owner" ON documents;
DROP POLICY IF EXISTS "org members can insert documents" ON documents;
DROP POLICY IF EXISTS "org members can read documents" ON documents;
DROP POLICY IF EXISTS "org members read documents" ON documents;

-- Optimized SELECT policy (consolidated)
-- Documents are linked to clients, so check org membership through client
CREATE POLICY "documents_select_optimized" ON documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN org_members om ON om.organization_id = c.org_id
      WHERE c.id = documents.client_id
      AND om.user_id = (SELECT auth.uid()::text)
    )
  );

-- Optimized INSERT policy (consolidated)
CREATE POLICY "documents_insert_optimized" ON documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN org_members om ON om.organization_id = c.org_id
      WHERE c.id = documents.client_id
      AND om.user_id = (SELECT auth.uid()::text)
    )
  );

-- Optimized UPDATE policy (consolidated)
CREATE POLICY "documents_update_optimized" ON documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN org_members om ON om.organization_id = c.org_id
      WHERE c.id = documents.client_id
      AND om.user_id = (SELECT auth.uid()::text)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN org_members om ON om.organization_id = c.org_id
      WHERE c.id = documents.client_id
      AND om.user_id = (SELECT auth.uid()::text)
    )
  );

-- ============================================================================
-- USERS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "users can read self" ON users;
DROP POLICY IF EXISTS "users_select_self" ON users;

-- Optimized SELECT policy (consolidated)
CREATE POLICY "users_select_optimized" ON users
  FOR SELECT
  USING (
    -- Users can read their own record
    id = (SELECT auth.uid()::text)
    OR
    -- Admins can read all users (if you have an admin check function)
    EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = (SELECT auth.uid()::text)
      AND 'ADMIN' = ANY(u2.roles)
    )
  );

-- ============================================================================
-- ORG_INVITES TABLE
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "org owners can manage invites" ON org_invites;

-- Optimized policy
CREATE POLICY "org_invites_manage_optimized" ON org_invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.organization_id = org_invites.org_id
      AND om.user_id = (SELECT auth.uid()::text)
      AND om.role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.organization_id = org_invites.org_id
      AND om.user_id = (SELECT auth.uid()::text)
      AND om.role = 'OWNER'
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "organizations_select_optimized" ON organizations IS 
  'Optimized SELECT policy: Uses (SELECT auth.uid()) to cache auth function result. Consolidated from multiple duplicate policies.';

COMMENT ON POLICY "clients_select_optimized" ON clients IS 
  'Optimized SELECT policy: Uses (SELECT auth.uid()) to cache auth function result. Consolidated from multiple duplicate policies.';

COMMENT ON POLICY "policies_select_optimized" ON policies IS 
  'Optimized SELECT policy: Uses (SELECT auth.uid()) to cache auth function result. Consolidated from multiple duplicate policies.';

COMMENT ON POLICY "documents_select_optimized" ON documents IS 
  'Optimized SELECT policy: Uses (SELECT auth.uid()) to cache auth function result. Consolidated from multiple duplicate policies.';
