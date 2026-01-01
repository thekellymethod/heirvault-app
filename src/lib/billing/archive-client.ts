/**
 * Client Archiving Utilities
 * 
 * Helper functions to archive/unarchive clients (soft delete).
 * Archiving a client removes it from active estate count.
 */

import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/db";
import { trackActiveEstateCount } from "./active-estates-tracker";

/**
 * Archive a client (soft delete)
 * Sets archivedAt timestamp, removing it from active estate count
 */
export async function archiveClient(
  clientId: string,
  organizationId: string,
  userId?: string
): Promise<void> {
  const client = await prisma.clients.findFirst({
    where: {
      id: clientId,
      orgId: organizationId,
    },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  if (client.archivedAt) {
    // Already archived
    return;
  }

  await prisma.clients.update({
    where: { id: clientId },
    data: { archivedAt: new Date() },
  });

  await writeAuditLog({
    action: "CLIENT_UPDATED",
    message: `Client archived: ${client.firstName} ${client.lastName} (${client.email})`,
    userId: userId || null,
    orgId: organizationId,
    clientId,
    policyId: null,
  });

  // Track active estate count change
  await trackActiveEstateCount(organizationId, userId || null);
}

/**
 * Unarchive a client (restore)
 * Removes archivedAt timestamp, potentially adding it back to active estate count
 */
export async function unarchiveClient(
  clientId: string,
  organizationId: string,
  userId?: string
): Promise<void> {
  const client = await prisma.clients.findFirst({
    where: {
      id: clientId,
      orgId: organizationId,
    },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  if (!client.archivedAt) {
    // Not archived
    return;
  }

  await prisma.clients.update({
    where: { id: clientId },
    data: { archivedAt: null },
  });

  await writeAuditLog({
    action: "CLIENT_UPDATED",
    message: `Client unarchived: ${client.firstName} ${client.lastName} (${client.email})`,
    userId: userId || null,
    orgId: organizationId,
    clientId,
    policyId: null,
  });

  // Track active estate count change
  await trackActiveEstateCount(organizationId, userId || null);
}

/**
 * Check if client is archived
 */
export async function isClientArchived(clientId: string): Promise<boolean> {
  const client = await prisma.clients.findUnique({
    where: { id: clientId },
    select: { archivedAt: true },
  });

  return client?.archivedAt !== null;
}
