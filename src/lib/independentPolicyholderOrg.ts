/**
 * Default organization for policyholders who submit through public intake
 * before any law firm claims or assigns them.
 *
 * Seeded by migration `20260418120000_independent_policyholder_organization.sql`.
 * Override in deployment with `HEIRVAULT_INDEPENDENT_POLICYHOLDER_ORG_ID` if you use a different UUID.
 */
export const INDEPENDENT_POLICYHOLDER_ORG_ID = "01000000-0000-4000-8000-000000000001" as const;

export const INDEPENDENT_POLICYHOLDER_ORG_SLUG = "heirvault-independent-policyholders" as const;

export function getIndependentPolicyholderOrgId(): string {
  const fromEnv = process.env.HEIRVAULT_INDEPENDENT_POLICYHOLDER_ORG_ID?.trim();
  if (fromEnv && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fromEnv)) {
    return fromEnv.toLowerCase();
  }
  return INDEPENDENT_POLICYHOLDER_ORG_ID;
}
