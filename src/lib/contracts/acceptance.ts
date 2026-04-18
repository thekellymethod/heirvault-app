/**
 * Contract Acceptance Management
 * 
 * Handles immutable contract acceptance records for tier-based access control.
 */

;
import { Tier, type TierType } from "@/lib/tiers";

export const CONTRACT_VERSION = "1.0.0"; // Current contract version

export interface ContractAcceptanceInput {
  organizationId: string;
  userId: string;
  tier: TierType;
  jurisdiction?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Record a contract acceptance
 * Creates an immutable record of contract acceptance for audit purposes
 */
export async function recordContractAcceptance(
  input: ContractAcceptanceInput
): Promise<void> {
  const { create } = await import("@/lib/db");
  const { randomUUID } = await import("crypto");
  
  await create("contract_acceptances", {
    id: randomUUID(),
    organizationId: input.organizationId,
    userId: input.userId,
    tier: input.tier,
    contractVersion: CONTRACT_VERSION,
    jurisdiction: input.jurisdiction ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    acceptedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  // Emit billing event for contract acceptance
  const { emitAddendumAcceptanceEvent } = await import("@/lib/billing/ledger");
  await emitAddendumAcceptanceEvent(
    input.organizationId,
    input.tier,
    CONTRACT_VERSION,
    input.jurisdiction ?? null,
    input.userId
  );
}

/**
 * Check if an organization has accepted a contract for a specific tier
 */
export async function hasAcceptedContract(
  organizationId: string,
  tier: TierType,
  contractVersion: string = CONTRACT_VERSION
): Promise<boolean> {
  const { getDb } = await import("@/lib/db");
  const db = getDb();
  
  // PostgREST column names are snake_case (matches DB migration)
  const { data: acceptances } = await db
    .from("contract_acceptances")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("tier", tier)
    .eq("contract_version", contractVersion)
    .limit(1);

  return acceptances !== null && acceptances.length > 0;
}

/**
 * Get all contract acceptances for an organization
 */
export async function getContractAcceptances(organizationId: string) {
  const { findMany: findManyAcceptances, findUnique: findUniqueUser } = await import("@/lib/db");
  
  type ContractAcceptanceRecord = {
    id: string;
    organizationId: string;
    userId: string;
    tier: string;
    contractVersion: string;
    acceptedAt: string;
    [key: string]: unknown;
  };
  
  const acceptances = await findManyAcceptances<ContractAcceptanceRecord>("contract_acceptances", {
    where: { organizationId },
    orderBy: { column: "acceptedAt", ascending: false },
  });

  // Fetch user details for each acceptance
  const acceptancesWithUsers = await Promise.all(
    acceptances.map(async (acceptance) => {
      type UserRecord = {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
      };
      
      const user = await findUniqueUser<UserRecord>("users", { id: acceptance.userId });
      
      return {
        ...acceptance,
        users: user ? {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        } : null,
      };
    })
  );

  return acceptancesWithUsers;
}

/**
 * Require Base Tier contract acceptance
 * Throws if not accepted - use this to gate dashboard access
 */
export async function requireBaseTierAcceptance(
  organizationId: string
): Promise<void> {
  const hasAccepted = await hasAcceptedContract(organizationId, Tier.BASE);
  
  if (!hasAccepted) {
    const { HttpError } = await import("@/lib/permissions/guard");
    throw new HttpError(
      403,
      "Base Tier contract acceptance is required to access the dashboard."
    );
  }
}
