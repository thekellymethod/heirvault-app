// src/app/api/review/queue/route.ts
import { NextResponse } from "next/server";
;
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { ChangeRequestStatus, DocumentClassificationStatus, UserRole } from "@prisma/client";

export async function GET() {
  const principal = await requireAuthPrincipal();
  requireRole(principal, [UserRole.ADMIN, UserRole.attorney]);

  // If admin, show all; otherwise filter by client access
  const docsWhere = principal.role === UserRole.ADMIN
    ? { classificationStatus: DocumentClassificationStatus.NEEDS_REVIEW }
    : {
        classificationStatus: DocumentClassificationStatus.NEEDS_REVIEW,
        clients: { 
          attorneyClientAccess: { 
            some: { 
              attorneyId: principal.dbUserId,
              isActive: true,
            } 
          } 
        },
      };

  const docs = await prisma.documents.findMany({
    where: docsWhere,
    orderBy: { createdAt: "desc" },
    include: { clients: true },
    take: 200,
  });

  const changeRequestsWhere = principal.role === UserRole.ADMIN
    ? { status: { in: [ChangeRequestStatus.SUBMITTED, ChangeRequestStatus.NEEDS_REVIEW] } }
    : {
        status: { in: [ChangeRequestStatus.SUBMITTED, ChangeRequestStatus.NEEDS_REVIEW] },
        clients: { 
          attorneyClientAccess: { 
            some: { 
              attorneyId: principal.dbUserId,
              isActive: true,
            } 
          } 
        },
      };

  const changeRequests = await prisma.change_requests.findMany({
    where: changeRequestsWhere,
    orderBy: { createdAt: "desc" },
    include: { clients: true },
    take: 200,
  });

  return NextResponse.json({
    ok: true,
    documents: docs.map((d) => ({
      kind: "DOCUMENT",
      documentId: d.id,
      clientId: d.clientId,
      clientName: `${d.clients.firstName ?? ""} ${d.clients.lastName ?? ""}`.trim(),
      docType: d.fileType,
      sensitivity: d.sensitivityLevel,
      status: d.classificationStatus,
      createdAt: d.createdAt,
      changeRequestId: d.changeRequestId ?? null,
      inviteId: null, // documents don't have inviteId directly, would need to look up
      confidenceScore: d.confidenceScore ?? null,
      // Note: Redacted preview support can be added by adding redactedPreviewKey field to documents table
      hasRedactedPreview: false,
    })),
    changeRequests: changeRequests.map((cr) => ({
      kind: "CHANGE_REQUEST",
      changeRequestId: cr.id,
      clientId: cr.clientId,
      clientName: `${cr.clients.firstName ?? ""} ${cr.clients.lastName ?? ""}`.trim(),
      requestType: cr.requestType,
      status: cr.status,
      createdAt: cr.createdAt,
      submittedAt: cr.submittedAt ?? null,
    })),
  });
}

