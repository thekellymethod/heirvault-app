/**
 * Contract Acceptance Management
 * 
 * Handles immutable contract acceptance records for tier-based access control.
 */

import { prisma } from "@/lib/db";
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
  await prisma.contract_acceptances.create({
    data: {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      userId: input.userId,
      tier: input.tier,
      contractVersion: CONTRACT_VERSION,
      jurisdiction: input.jurisdiction ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
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
  const acceptance = await prisma.contract_acceptances.findUnique({
    where: {
      organizationId_tier_contractVersion: {
        organizationId,
        tier,
        contractVersion,
      },
    },
  });

  return acceptance !== null;
}

/**
 * Get all contract acceptances for an organization
 */
export async function getContractAcceptances(organizationId: string) {
  return prisma.contract_acceptances.findMany({
    where: { organizationId },
    orderBy: { acceptedAt: "desc" },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
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
      "BASE_TIER_CONTRACT_REQUIRED",
      "Base Tier contract acceptance is required to access the dashboard."
    );
  }
}
