import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { assertAttorneyCanAccessClient } from "@/lib/authz";
import { ReceiptsAuditTrailView } from "./_components/ReceiptsAuditTrailView";

export const runtime = "nodejs";

export default async function ReceiptsAuditTrailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id: clientId } = await params;

  // Verify attorney has access to this client
  await assertAttorneyCanAccessClient(clientId);

  // Get client info
  const client = await prisma.$queryRawUnsafe<Array<{
    id: string,
    firstName: string,
    lastName: string,
    email: string,
  }>>(`
    SELECT id, firstName, lastName, email
    FROM clients
    WHERE id = $1
    LIMIT 1
  `, clientId);

  if (!client || client.length === 0) {
    redirect("/dashboard/clients");
  }

  return (
    <ReceiptsAuditTrailView 
      clientId={clientId}
      clientName={`${client[0].firstName} ${client[0].lastName}`}
      clientEmail={client[0].email}
    />
  );
}

