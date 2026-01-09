import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/utils/clerk";
import { assertAttorneyCanAccessClient } from "@/lib/authz";
import { ReceiptsAuditTrailView } from "./_components/ReceiptsAuditTrailView";

export const runtime = "nodejs";

export default async function ReceiptsAuditTrailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const _user = await requireAuth();
  const { id: clientId } = await params;

  // Verify attorney has access to this client
  await assertAttorneyCanAccessClient(clientId);

  // Get client info
  const { queryRaw } = await import("@/lib/db");

  type ClientRow = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  const client = await queryRaw<ClientRow>(`
    SELECT id, "firstName", "lastName", email
    FROM clients
    WHERE id = $1
    LIMIT 1
  `, [clientId]);

  if (!client || client.length === 0) {
    redirect("/dashboard/clients");
  }

  const clientRow = client[0];
  if (!clientRow) {
    redirect("/dashboard/clients");
  }

  return (
    <ReceiptsAuditTrailView 
      clientId={clientId}
      clientName={`${clientRow.firstName} ${clientRow.lastName}`}
      clientEmail={clientRow.email}
    />
  );
}

