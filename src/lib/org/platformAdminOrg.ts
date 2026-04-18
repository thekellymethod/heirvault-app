import "server-only";

/**
 * Organizations that represent HeirVault platform administration.
 * These always receive the highest feature tier (FIRM_WIDE) without contract or billing gates.
 *
 * Match rules (any is enough):
 * - HEIRVAULT_ADMIN_ORGANIZATION_ID equals organization id
 * - Name (case-insensitive): "Admin Org"
 * - Slug (case-insensitive): "admin-org"
 */
export type OrgIdentity = {
  id: string;
  name?: string | null;
  slug?: string | null;
};

export function isPlatformAdminUnrestrictedOrg(org: OrgIdentity): boolean {
  const envId = process.env.HEIRVAULT_ADMIN_ORGANIZATION_ID?.trim();
  if (envId && org.id === envId) return true;

  const name = (org.name ?? "").trim().toLowerCase();
  if (name === "admin org") return true;

  const slug = (org.slug ?? "").trim().toLowerCase();
  if (slug === "admin-org") return true;

  return false;
}
