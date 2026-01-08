// src/app/api/review/queue/route.ts
import { NextResponse } from "next/server";
;
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { ChangeRequestStatus, DocumentClassificationStatus, UserRole } from "@/lib/db/enums";

export async function GET() {
  const principal = await requireAuthPrincipal();
  requireRole(principal, [UserRole.attorney]);

  const { findMany: findManyDocs, findMany: findManyChangeRequests, findUnique: findUniqueClient, findMany: findManyAccess, getDb } = await import("@/lib/db");
  
  type DocumentRecord = {
    id: string;
    clientId: string;
    fileType: string;
    sensitivityLevel: string;
    classificationStatus: string;
    createdAt: string;
    changeRequestId: string | null;
    confidenceScore: number | null;
  };
  
  type ChangeRequestRecord = {
    id: string;
    clientId: string;
    requestType: string;
    status: string;
    createdAt: string;
    submittedAt: string | null;
  };
  
  type ClientRecord = {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
  
  // Get all documents needing review
  let allDocs = await findManyDocs<DocumentRecord>("documents", {
    where: { classificationStatus: DocumentClassificationStatus.NEEDS_REVIEW },
    orderBy: { column: "createdAt", ascending: false },
    limit: 200,
  });

  // If not admin, filter by client access
  if (!principal.roles.includes("ADMIN")) {
    // Get accessible client IDs
    type AccessRecord = { clientId: string };
    const accessRecords = await findManyAccess<AccessRecord>("attorney_client_access", {
      where: { attorneyId: principal.dbUserId, isActive: true },
    }) as AccessRecord[];
    const accessibleClientIds = accessRecords.map((a) => a.clientId);
    
    allDocs = (allDocs || []).filter(doc => accessibleClientIds.includes(doc.clientId));
  }

  // Fetch clients for documents
  const docsWithClients = await Promise.all(
    (allDocs || []).map(async (d) => {
      const client = await findUniqueClient<ClientRecord>("clients", { id: d.clientId });
      return {
        ...d,
        client: client || null,
      };
    })
  );

  // Get all change requests needing review
  let allChangeRequests = await findManyChangeRequests<ChangeRequestRecord>("change_requests", {
    where: { 
      status: { in: [ChangeRequestStatus.SUBMITTED, ChangeRequestStatus.NEEDS_REVIEW] } 
    },
    orderBy: { column: "createdAt", ascending: false },
    limit: 200,
  });

  // If not admin, filter by client access
  if (!principal.roles.includes("ADMIN")) {
    // Get accessible client IDs
    type AccessRecord = { clientId: string };
    const accessRecords = await findManyAccess<AccessRecord>("attorney_client_access", {
      where: { attorneyId: principal.dbUserId, isActive: true },
    }) as AccessRecord[];
    const accessibleClientIds = accessRecords.map((a) => a.clientId);
    
    allChangeRequests = (allChangeRequests || []).filter(cr => accessibleClientIds.includes(cr.clientId));
  }

  // Fetch clients for change requests
  const changeRequestsWithClients = await Promise.all(
    (allChangeRequests || []).map(async (cr) => {
      const client = await findUniqueClient<ClientRecord>("clients", { id: cr.clientId });
      return {
        ...cr,
        client: client || null,
      };
    })
  );

  return NextResponse.json({
    ok: true,
    documents: docsWithClients.map((d) => ({
      kind: "DOCUMENT",
      documentId: d.id,
      clientId: d.clientId,
      clientName: d.client 
        ? `${d.client.firstName ?? ""} ${d.client.lastName ?? ""}`.trim() 
        : "Unknown",
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
    changeRequests: changeRequestsWithClients.map((cr) => ({
      kind: "CHANGE_REQUEST",
      changeRequestId: cr.id,
      clientId: cr.clientId,
      clientName: cr.client 
        ? `${cr.client.firstName ?? ""} ${cr.client.lastName ?? ""}`.trim() 
        : "Unknown",
      requestType: cr.requestType,
      status: cr.status,
      createdAt: cr.createdAt,
      submittedAt: cr.submittedAt ?? null,
    })),
  });
}

