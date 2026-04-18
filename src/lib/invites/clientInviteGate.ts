import "server-only";

import { findUnique } from "@/lib/db";
import { ClientInviteStatus } from "@/lib/db/enums";

export type PendingClientInviteRow = {
  id: string;
  tokenHash: string;
  status: string;
  expiresAt: string | Date;
  submissionCount: number;
  maxSubmissions: number;
  clientId: string;
  /** ISO string from DB; used by intake to scope documents to this invite. */
  createdAt?: string;
};

export type ClientInviteClientRow = {
  id: string;
  orgId?: string | null;
  organizationId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

export type ClientInviteGateFailure = { ok: false; status: number; error: string };
export type ClientInviteGateSuccess = { ok: true; invite: PendingClientInviteRow; client: ClientInviteClientRow };

/**
 * Shared gate for public invite flows: pending invite, not expired, under submission cap, client exists.
 */
export async function loadPendingClientInviteWithClient(
  tokenHash: string
): Promise<ClientInviteGateFailure | ClientInviteGateSuccess> {
  const invite = await findUnique<PendingClientInviteRow>("client_invites", { tokenHash });
  if (!invite || invite.status !== ClientInviteStatus.PENDING) {
    return { ok: false, status: 403, error: "Invite invalid" };
  }

  const expiresAt = typeof invite.expiresAt === "string" ? new Date(invite.expiresAt) : invite.expiresAt;
  if (expiresAt.getTime() < Date.now()) {
    return { ok: false, status: 403, error: "Invite expired" };
  }

  if (invite.submissionCount >= invite.maxSubmissions) {
    return { ok: false, status: 403, error: "Invite used" };
  }

  const client = await findUnique<ClientInviteClientRow>("clients", { id: invite.clientId });
  if (!client) {
    return { ok: false, status: 404, error: "Client not found" };
  }

  return { ok: true, invite, client };
}
