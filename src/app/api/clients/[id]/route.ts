import { NextRequest, NextResponse } from "next/server";
;
import { requireAuthApi } from "@/lib/utils/clerk";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthApi();
  if (auth.response) return auth.response;
  const { user } = auth;

  const { id: clientId } = await params;

  // Access check
  const { findMany: findManyAccess, findUnique, count: countDb } = await import("@/lib/db");
  const accessRecords = await findManyAccess("attorney_client_access", {
    where: { attorneyId: user.id, clientId, isActive: true },
    limit: 1,
  });

  if (!accessRecords || accessRecords.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get client
  const client = await findUnique("clients", { id: clientId });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Get counts for related entities
  const [policiesCount, beneficiariesCount, invitesCount] = await Promise.all([
    countDb("policies", { clientId }),
    countDb("beneficiaries", { clientId }),
    countDb("client_invites", { clientId }),
  ]);

  // Format response with counts
  type ClientRecord = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  
  const clientTyped = client as ClientRecord;
  const clientWithCounts = {
    id: clientTyped.id,
    firstName: clientTyped.firstName,
    lastName: clientTyped.lastName,
    email: clientTyped.email,
    phone: clientTyped.phone || null,
    dateOfBirth: clientTyped.dateOfBirth || null,
    createdAt: clientTyped.createdAt,
    updatedAt: clientTyped.updatedAt,
    _count: {
      policies: policiesCount,
      beneficiaries: beneficiariesCount,
      clientInvites: invitesCount,
    },
  };

  return NextResponse.json({ client: clientWithCounts });
}
