-- Canonical organization for policyholders who are not yet tied to a law firm.
-- Application code uses the same UUID (override with HEIRVAULT_INDEPENDENT_POLICYHOLDER_ORG_ID if needed).
-- Do not delete this organization: clients.org_id references it (ON DELETE CASCADE would remove those rows).

INSERT INTO public.organizations (id, name, slug, created_at, updated_at)
VALUES (
  '01000000-0000-4000-8000-000000000001'::uuid,
  'Independent policyholders (HeirVault)',
  'heirvault-independent-policyholders',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.clients
SET org_id = '01000000-0000-4000-8000-000000000001'::uuid
WHERE org_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = '01000000-0000-4000-8000-000000000001'::uuid
  );
