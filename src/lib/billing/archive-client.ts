/**
 * Client Archiving Utilities
 * 
 * Helper functions to archive/unarchive clients (soft delete).
 * Archiving a client removes it from active estate count.
 */

;
import { logAuditEvent } from "@/lib/audit";
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
  const { findUnique, update: updateDb } = await import("@/lib/db");
  
  type ClientRecord = {
    id: string;
    orgId: string | null;
    archivedAt: string | null;
    firstName: string;
    lastName: string;
    email: string;
  };
  
  const client = await findUnique<ClientRecord>("clients", {
    id: clientId,
    orgId: organizationId,
  });

  if (!client) {
    throw new Error("Client not found");
  }

  if (client.archivedAt) {
    // Already archived
    return;
  }

  await updateDb("clients", { id: clientId }, {
    archivedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await logAuditEvent({
    action: "CLIENT_UPDATED",
    userId: userId || null,
    clientId,
    metadata: {
      message: `Client archived: ${client.firstName} ${client.lastName} (${client.email})`,
      orgId: organizationId,
    },
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
  const { findUnique, update: updateDb } = await import("@/lib/db");
  
  type ClientRecord = {
    id: string;
    orgId: string | null;
    archivedAt: string | null;
    firstName: string;
    lastName: string;
    email: string;
  };
  
  const client = await findUnique<ClientRecord>("clients", {
    id: clientId,
    orgId: organizationId,
  });

  if (!client) {
    throw new Error("Client not found");
  }

  if (!client.archivedAt) {
    // Not archived
    return;
  }

  await updateDb("clients", { id: clientId }, {
    archivedAt: null,
    updatedAt: new Date().toISOString(),
  });

  await logAuditEvent({
    action: "CLIENT_UPDATED",
    userId: userId || null,
    clientId,
    metadata: {
      message: `Client unarchived: ${client.firstName} ${client.lastName} (${client.email})`,
      orgId: organizationId,
    },
  });

  // Track active estate count change
  await trackActiveEstateCount(organizationId, userId || null);
}

/**
 * Check if client is archived
 */
export async function isClientArchived(clientId: string): Promise<boolean> {
  const { findUnique } = await import("@/lib/db");
  
  type ClientRecord = {
    id: string;
    archivedAt: string | null;
  };
  
  const client = await findUnique<ClientRecord>("clients", { id: clientId });

  if (!client) {
    return false;
  }

  return client.archivedAt !== null && client.archivedAt !== undefined;
}
