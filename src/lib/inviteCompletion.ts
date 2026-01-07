// src/lib/inviteCompletion.ts
;
import { ClientInviteStatus, DocumentClassificationStatus } from "@/lib/db/enums";

export async function tryCompleteInvite(inviteId: string) {
  const invite = await prisma.client_invites.findUnique({
    where: { id: inviteId },
    select: { clientId: true, createdAt: true },
  });

  if (!invite) return;

  // Get documents for this invite
  const docs = await prisma.documents.findMany({
    where: {
      clientId: invite.clientId,
      uploadedVia: "CLIENT_INVITE_UPLOAD",
      createdAt: { gte: invite.createdAt },
    },
  });

  if (!docs.length) return;

  const allAccepted = docs.every(d =>
    d.classificationStatus === DocumentClassificationStatus.APPROVED ||
    d.classificationStatus === DocumentClassificationStatus.AUTO_ACCEPTED
  );

  if (allAccepted) {
    await prisma.client_invites.update({
      where: { id: inviteId },
      data: { status: ClientInviteStatus.COMPLETED },
    });
  }
}

