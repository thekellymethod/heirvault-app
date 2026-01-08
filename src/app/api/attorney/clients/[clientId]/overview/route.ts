// src/app/api/attorney/clients/[clientId]/overview/route.ts
// import { NextResponse } from "next/server";
;
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireClientAccess } from "@/lib/permissions/guard";
import { UserRole } from "@/lib/db/enums";

export async function GET(_: Request, ctx: { params: Promise<{ clientId: string }> }) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    // Check if user is admin via roles array, or has attorney role
    if (!principal.roles.includes("ADMIN") && principal.role !== UserRole.attorney) {
      throw new Error("Forbidden");
    }
    
    const { clientId } = await ctx.params;
    await requireClientAccess({ principal, clientId });

  const { findUnique: findUniqueClient, findMany: findManyDb } = await import("@/lib/db");
  
  // Fetch client
  const client = await findUniqueClient("clients", { id: clientId });
  if (!client) throw new Error("Client not found");

  // Fetch related data separately
  const policies = await findManyDb("expected_policies", {
    where: { clientId },
    orderBy: { column: "createdAt", ascending: false },
    limit: 1,
  });

  const clientInvites = await findManyDb("client_invites", {
    where: { clientId },
    orderBy: { column: "createdAt", ascending: false },
    limit: 10,
  });

  const changeRequests = await findManyDb("change_requests", {
    where: { clientId },
    orderBy: { column: "createdAt", ascending: false },
    limit: 20,
  });

  const documents = await findManyDb("documents", {
    where: { clientId },
    orderBy: { column: "createdAt", ascending: false },
    limit: 200,
  });

  const artifacts = await findManyDb("artifacts", {
    where: { clientId, type: "RECEIPT_PDF" },
    orderBy: { column: "createdAt", ascending: false },
    limit: 30,
  });

  const beneficiaries = await findManyDb("beneficiaries", {
    where: { clientId },
    orderBy: { column: "createdAt", ascending: false },
    limit: 100,
  });

  // Combine data
  const clientWithRelations = {
    ...client,
    policies: policies || [],
    clientInvites: clientInvites || [],
    changeRequests: changeRequests || [],
    documents: documents || [],
    artifacts: artifacts || [],
    beneficiaries: beneficiaries || [],
  } as any;

  const clientName = `${(clientWithRelations as any).firstName ?? ""} ${(clientWithRelations as any).lastName ?? ""}`.trim();

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
      isAdmin: principal.roles.includes("ADMIN"),
    },
    client: {
      id: (clientWithRelations as any).id,
      name: clientName,
      email: (clientWithRelations as any).email, // attorney/admin only
      dob: (clientWithRelations as any).dateOfBirth ? new Date((clientWithRelations as any).dateOfBirth).toISOString() : null,
      createdAt: (clientWithRelations as any).createdAt,
    },
    policyExpected: (clientWithRelations.policies[0] as any)
      ? {
          id: (clientWithRelations.policies[0] as any).id,
          carrierName: (clientWithRelations.policies[0] as any).carrierName,
          carrierAlias: (clientWithRelations.policies[0] as any).carrierAlias,
          policyNumber: (clientWithRelations.policies[0] as any).policyNumber,
          expectedBeneficiaryCount: (clientWithRelations.policies[0] as any).expectedBeneficiaryCount,
          createdAt: (clientWithRelations.policies[0] as any).createdAt,
        }
      : null,
    invites: (clientWithRelations.clientInvites as any[]).map((i: any) => ({
      id: i.id,
      status: i.status,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
      submissionCount: i.submissionCount ?? 0,
      maxSubmissions: i.maxSubmissions ?? 0,
    })),
    changeRequests: (clientWithRelations.changeRequests as any[]).map((cr: any) => ({
      id: cr.id,
      status: cr.status,
      requestType: cr.requestType,
      createdAt: cr.createdAt,
      submittedAt: cr.submittedAt ?? null,
      expiresAt: cr.expiresAt,
      submissionCount: cr.submissionCount ?? 0,
      maxSubmissions: cr.maxSubmissions ?? 0,
      note: cr.note ?? null,
    })),
    documents: (clientWithRelations.documents as any[]).map((d: any) => ({
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
      processingState: d.processingState ?? "QUEUED",
      processingAttempts: d.processingAttempts ?? 0,
      lastProcessingError: d.lastProcessingError ?? null,
      hasRedactedPreview: !!d.redactedPreviewKey,
    })),
    receipts: (clientWithRelations.artifacts as any[]).map((a: any) => ({
      id: a.id,
      artifactId: a.id, // For opening the artifact
      createdAt: a.createdAt,
      receiptNumber: ((a.metadata as Record<string, unknown> | null)?.receiptNumber as string | undefined) ?? null,
      kind: ((a.metadata as Record<string, unknown> | null)?.kind as string | undefined) ?? null, // INTAKE or CHANGE_REQUEST
      changeRequestId: ((a.metadata as Record<string, unknown> | null)?.changeRequestId as string | undefined) ?? null,
      inviteId: a.inviteId ?? null,
    })),
    beneficiaries: (clientWithRelations.beneficiaries as any[]).map((b: any) => ({
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

