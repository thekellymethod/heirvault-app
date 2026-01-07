/**
 * Looks up a client invite by token using Supabase
 */
export async function lookupClientInvite(token: string) {
  type InviteRow = {
    id: string;
    clientId: string;
    client_id: string;
    email: string;
    token: string;
    expires_at: string | Date;
    used_at: string | Date | null;
    createdAt: string | Date;
  };

  type ClientRow = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    dateOfBirth: string | Date | null;
  };

  try {
    // First, find the invite by token
    const { findMany: findManyInvites } = await import("@/lib/db");
    const invites = await findManyInvites<InviteRow>("client_invites", {
      where: { token },
      limit: 1,
    });

    if (!invites || invites.length === 0) {
      return null;
    }

    const invite = invites[0];
    const clientId = invite.clientId || invite.client_id;

    if (!clientId) {
      return null;
    }

    // Then, find the associated client
    const { findUnique: findUniqueClient } = await import("@/lib/db");
    const client = await findUniqueClient<ClientRow>("clients", { id: clientId });

    if (!client) {
      return null;
    }

    // Convert dates appropriately
    const expiresAt = invite.expires_at instanceof Date 
      ? invite.expires_at 
      : invite.expires_at 
        ? new Date(invite.expires_at) 
        : null;
    
    const usedAt = invite.used_at instanceof Date 
      ? invite.used_at 
      : invite.used_at 
        ? new Date(invite.used_at) 
        : null;
    
    const createdAt = invite.createdAt instanceof Date 
      ? invite.createdAt 
      : new Date(invite.createdAt);
    
    const dateOfBirth = client.dateOfBirth instanceof Date 
      ? client.dateOfBirth 
      : client.dateOfBirth 
        ? new Date(client.dateOfBirth) 
        : null;

    return {
      id: invite.id,
      clientId: clientId,
      email: invite.email,
      token: invite.token,
      expiresAt: expiresAt,
      usedAt: usedAt,
      createdAt: createdAt,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        dateOfBirth: dateOfBirth,
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("lookupClientInvite: Failed:", errorMessage);
    return null;
  }
}

