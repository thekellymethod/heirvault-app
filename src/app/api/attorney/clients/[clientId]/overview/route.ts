// src/app/api/attorney/clients/[clientId]/overview/route.ts
// import { NextResponse } from "next/server";
;
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole, requireClientAccess } from "@/lib/permissions/guard";
import { UserRole } from "@prisma/client";

export async function GET(_: Request, ctx: { params: Promise<{ clientId: string }> }) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.ADMIN, UserRole.attorney]);
    
    const { clientId } = await ctx.params;
    await requireClientAccess({ principal, clientId });

  const client = await prisma.clients.findUnique({
    where: { id: clientId },
    include: {
      // latest policy expectations
      policies: { orderBy: { createdAt: "desc" }, take: 1 },

      // invites for this client
      clientInvites: { orderBy: { createdAt: "desc" }, take: 10 },

      // change requests
      changeRequests: { orderBy: { createdAt: "desc" }, take: 20 },

      // documents (latest first)
      documents: { orderBy: { createdAt: "desc" }, take: 200 },

      // artifacts (receipts)
      artifacts: {
        where: { type: "RECEIPT_PDF" },
        orderBy: { createdAt: "desc" },
        take: 30,
      },

      // current beneficiaries (truth)
      beneficiaries: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });

  if (!client) throw new Error("Client not found");

  const clientName = `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim();

  // Proposed beneficiaries - if you add ProposedBeneficiary model later, include it here
  // For now, we'll return empty array
  const proposedBeneficiaries: Array<{
    id: string;
    fullName: string;
    status: string;
  }> = [];

  return {
    ok: true,
    principal: {
      role: principal.role,
      isAdmin: principal.role === UserRole.ADMIN,
    },
    client: {
      id: client.id,
      name: clientName,
      email: client.email, // attorney/admin only
      dob: client.dateOfBirth ? client.dateOfBirth.toISOString() : null,
      createdAt: client.createdAt,
    },
    policyExpected: client.policies[0]
      ? {
          id: client.policies[0].id,
          carrierName: client.policies[0].carrierName,
          carrierAlias: client.policies[0].carrierAlias,
          policyNumber: client.policies[0].policyNumber,
          expectedBeneficiaryCount: client.policies[0].expectedBeneficiaryCount,
          createdAt: client.policies[0].createdAt,
        }
      : null,
    invites: client.clientInvites.map((i) => ({
      id: i.id,
      status: i.status,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
      submissionCount: i.submissionCount,
      maxSubmissions: i.maxSubmissions,
    })),
    changeRequests: client.changeRequests.map((cr) => ({
      id: cr.id,
      status: cr.status,
      requestType: cr.requestType,
      createdAt: cr.createdAt,
      submittedAt: cr.submittedAt ?? null,
      expiresAt: cr.expiresAt,
      submissionCount: cr.submissionCount,
      maxSubmissions: cr.maxSubmissions,
      note: cr.note ?? null,
    })),
    documents: client.documents.map((d) => ({
      id: d.id,
      docType: d.fileType, // Using fileType as docType
      status: d.classificationStatus,
      sensitivity: d.sensitivityLevel,
      createdAt: d.createdAt,
      versionGroupId: d.versionGroupId ?? null,
      versionNumber: d.versionNumber ?? 1,
      supersededAt: d.supersededAt ?? null,
      changeRequestId: d.changeRequestId ?? null,
      inviteId: d.uploadedVia?.includes("INVITE") ? "linked" : null, // Simplified
      confidenceScore: d.confidenceScore ?? null, // attorney/admin only
      processingState: (d as { processingState?: string }).processingState ?? "QUEUED",
      processingAttempts: (d as { processingAttempts?: number }).processingAttempts ?? 0,
      lastProcessingError: (d as { lastProcessingError?: string | null }).lastProcessingError ?? null,
      hasRedactedPreview: !!(d as { redactedPreviewKey?: string | null }).redactedPreviewKey,
    })),
    receipts: client.artifacts.map((a) => ({
      id: a.id,
      artifactId: a.id, // For opening the artifact
      createdAt: a.createdAt,
      receiptNumber: ((a.metadata as Record<string, unknown> | null)?.receiptNumber as string | undefined) ?? null,
      kind: ((a.metadata as Record<string, unknown> | null)?.kind as string | undefined) ?? null, // INTAKE or CHANGE_REQUEST
      changeRequestId: ((a.metadata as Record<string, unknown> | null)?.changeRequestId as string | undefined) ?? null,
      inviteId: a.inviteId ?? null,
    })),
    beneficiaries: client.beneficiaries.map((b) => ({
      id: b.id,
      fullName: `${b.firstName ?? ""} ${b.lastName ?? ""}`.trim(),
      isActive: b.isActive ?? true,
      createdAt: b.createdAt,
      versionGroupId: b.versionGroupId ?? null,
      versionNumber: b.versionNumber ?? 1,
      supersededAt: b.supersededAt ?? null,
    })),
    proposedBeneficiaries: proposedBeneficiaries,
  };
  });
}

