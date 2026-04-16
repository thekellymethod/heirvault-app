-- Tier contract acceptance records + billing audit ledger (PostgREST / service role).
-- Fixes PGRST205: Could not find the table 'public.contract_acceptances'.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS jurisdiction text;

CREATE TABLE IF NOT EXISTS public.contract_acceptances (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  tier text NOT NULL,
  contract_version text NOT NULL,
  jurisdiction text,
  ip_address text,
  user_agent text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contract_acceptances_org_tier_version_unique
    UNIQUE (organization_id, tier, contract_version)
);

CREATE INDEX IF NOT EXISTS idx_contract_acceptances_organization_id
  ON public.contract_acceptances (organization_id);

CREATE INDEX IF NOT EXISTS idx_contract_acceptances_user_id
  ON public.contract_acceptances (user_id);

CREATE TABLE IF NOT EXISTS public.billing_events_ledger (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_ledger_organization_id
  ON public.billing_events_ledger (organization_id);

CREATE INDEX IF NOT EXISTS idx_billing_events_ledger_created_at
  ON public.billing_events_ledger (created_at DESC);
