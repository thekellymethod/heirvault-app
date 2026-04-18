-- HeirVault private document storage: bucket heirvault-docs + policy_documents + RLS (Postgres + Storage).
-- Private bucket only (public = false). No public read URLs without signed URLs.

-- ---------------------------------------------------------------------------
-- 1) Storage bucket (private)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'heirvault-docs',
  'heirvault-docs',
  false,
  52428800,
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = COALESCE(EXCLUDED.file_size_limit, storage.buckets.file_size_limit);

-- ---------------------------------------------------------------------------
-- 2) policy_documents (metadata mirror of objects in heirvault-docs)
-- Path convention (object name relative to bucket):
--   {firm_id}/{estate_id}/{policy_id}/{type}/{filename}
-- where firm_id / estate_id / policy_id are UUID strings (RFC 4122), no slashes in type/filename.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.policy_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  estate_id uuid NOT NULL,
  policy_id uuid NOT NULL REFERENCES public.policies (id) ON DELETE CASCADE,
  file_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT policy_documents_path_segments_check CHECK (
    lower(file_path) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+/[^/]+$'
  )
);

CREATE INDEX IF NOT EXISTS idx_policy_documents_policy_id ON public.policy_documents (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_documents_estate_id ON public.policy_documents (estate_id);
CREATE INDEX IF NOT EXISTS idx_policy_documents_firm_id ON public.policy_documents (firm_id);

COMMENT ON TABLE public.policy_documents IS
  'Metadata for objects stored in storage bucket heirvault-docs. Object path = file_path; first segment = firm_id (organization).';

-- ---------------------------------------------------------------------------
-- 3) Helper: firm UUIDs the current Supabase auth user belongs to
-- Assumption: public.users.id equals auth.uid() for rows that participate in org_members.
-- (If you use Clerk-only JWTs without linking to Supabase auth.uid(), keep server access via service role
--  and/or sync Supabase Auth users with public.users.id.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.heirvault_auth_user_firm_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT om.organization_id
  FROM public.org_members om
  WHERE om.user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.heirvault_auth_user_firm_ids() IS
  'Returns organization (firm) ids for the current JWT user via org_members.user_id = auth.uid().';

-- ---------------------------------------------------------------------------
-- 4) Helper: first path segment as uuid (firm_id) from storage object name
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.heirvault_object_firm_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT split_part(object_name, '/', 1)::uuid;
$$;

COMMENT ON FUNCTION public.heirvault_object_firm_id(text) IS
  'Parses firm_id (first path segment) from heirvault-docs object path.';

-- ---------------------------------------------------------------------------
-- 5) RLS on policy_documents (firm-scoped via org_members)
-- ---------------------------------------------------------------------------
ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_documents_select_member ON public.policy_documents;
CREATE POLICY policy_documents_select_member
  ON public.policy_documents
  FOR SELECT
  TO authenticated
  USING (firm_id IN (SELECT public.heirvault_auth_user_firm_ids()));

DROP POLICY IF EXISTS policy_documents_insert_member ON public.policy_documents;
CREATE POLICY policy_documents_insert_member
  ON public.policy_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (firm_id IN (SELECT public.heirvault_auth_user_firm_ids()));

DROP POLICY IF EXISTS policy_documents_update_member ON public.policy_documents;
CREATE POLICY policy_documents_update_member
  ON public.policy_documents
  FOR UPDATE
  TO authenticated
  USING (firm_id IN (SELECT public.heirvault_auth_user_firm_ids()))
  WITH CHECK (firm_id IN (SELECT public.heirvault_auth_user_firm_ids()));

DROP POLICY IF EXISTS policy_documents_delete_member ON public.policy_documents;
CREATE POLICY policy_documents_delete_member
  ON public.policy_documents
  FOR DELETE
  TO authenticated
  USING (firm_id IN (SELECT public.heirvault_auth_user_firm_ids()));

-- service_role used by server helpers bypasses RLS; explicit grants below for API roles.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_documents TO authenticated;
GRANT ALL ON public.policy_documents TO service_role;

GRANT EXECUTE ON FUNCTION public.heirvault_auth_user_firm_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.heirvault_object_firm_id(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Storage RLS on storage.objects for bucket heirvault-docs
-- Object name must start with a firm folder equal to an org the user belongs to.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS heirvault_docs_select ON storage.objects;
CREATE POLICY heirvault_docs_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'heirvault-docs'
    AND public.heirvault_object_firm_id(name) IN (SELECT public.heirvault_auth_user_firm_ids())
  );

DROP POLICY IF EXISTS heirvault_docs_insert ON storage.objects;
CREATE POLICY heirvault_docs_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'heirvault-docs'
    AND public.heirvault_object_firm_id(name) IN (SELECT public.heirvault_auth_user_firm_ids())
  );

DROP POLICY IF EXISTS heirvault_docs_update ON storage.objects;
CREATE POLICY heirvault_docs_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'heirvault-docs'
    AND public.heirvault_object_firm_id(name) IN (SELECT public.heirvault_auth_user_firm_ids())
  )
  WITH CHECK (
    bucket_id = 'heirvault-docs'
    AND public.heirvault_object_firm_id(name) IN (SELECT public.heirvault_auth_user_firm_ids())
  );

DROP POLICY IF EXISTS heirvault_docs_delete ON storage.objects;
CREATE POLICY heirvault_docs_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'heirvault-docs'
    AND public.heirvault_object_firm_id(name) IN (SELECT public.heirvault_auth_user_firm_ids())
  );
