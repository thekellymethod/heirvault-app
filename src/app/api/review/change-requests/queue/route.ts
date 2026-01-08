// src/app/api/review/change-requests/queue/route.ts
import { NextResponse } from "next/server";
;
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { ChangeRequestStatus } from "@/lib/db/enums";

export async function GET() {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { findMany: findManyChangeRequests, findUnique: findUniqueClient, getDb } = await import("@/lib/db");
  
  type ChangeRequestRecord = {
    id: string;
    status: string;
    requestType: string;
    submittedAt: string | null;
    clientId: string;
  };
  
  type ClientRecord = {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
  
  // Note: Explicit ownership filtering recommended for production (currently returns all change requests)
  const changeRequests = await findManyChangeRequests<ChangeRequestRecord>("change_requests", {
    where: { 
      status: { in: [ChangeRequestStatus.SUBMITTED, ChangeRequestStatus.NEEDS_REVIEW] } 
    },
    orderBy: { column: "createdAt", ascending: false },
    limit: 100,
  });

  // Fetch clients and document counts separately
  const items = await Promise.all(
    (changeRequests || []).map(async (cr) => {
      const client = await findUniqueClient<ClientRecord>("clients", { id: cr.clientId });
      
      // Count documents for this change request
      const db = getDb();
      const { count: docCount } = await db
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("changeRequestId", cr.id);
      
      return {
        changeRequestId: cr.id,
        clientName: client 
          ? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() 
          : "Unknown",
        requestType: cr.requestType,
        status: cr.status,
        submittedAt: cr.submittedAt,
        docCount: docCount || 0,
      };
    })
  );

  return NextResponse.json({
    ok: true,
    items,
  });
}

