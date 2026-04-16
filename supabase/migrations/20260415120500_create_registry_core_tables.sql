-- Core registry tables required by add_registry_permissions and security/RLS migrations.
-- Idempotent: safe if tables already exist from manual setup.

CREATE TABLE IF NOT EXISTS public.registry_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decedent_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'PENDING_VERIFICATION',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registry_records_status ON public.registry_records (status);

CREATE TABLE IF NOT EXISTS public.registry_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id uuid NOT NULL REFERENCES public.registry_records (id) ON DELETE CASCADE,
  data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_by text NOT NULL DEFAULT 'SYSTEM',
  hash text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registry_versions_registry_id ON public.registry_versions (registry_id);

CREATE TABLE IF NOT EXISTS public.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_id uuid NOT NULL REFERENCES public.registry_records (id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  action text NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_registry_id ON public.access_logs (registry_id);

-- documents: required for RLS migrations; align with app camelCase "createdAt" column rule in supabase.ts
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  file_name text,
  file_type text,
  file_size bigint,
  file_path text,
  mime_type text,
  document_hash text,
  sensitivity_level text,
  classification_status text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_client_id ON public.documents (client_id);
