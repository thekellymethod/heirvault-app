import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { assertAttorneyCanAccessClient } from "@/lib/authz";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id: clientId } = await params;

  // Verify attorney has access to this client
  try {
    await assertAttorneyCanAccessClient(clientId);
  } catch {
    redirect("/error?type=forbidden");
  }

  // Get client data using raw SQL
  const clientData = await prisma.$queryRawUnsafe<Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    date_of_birth: Date | null;
    created_at: Date;
    updated_at: Date;
    policy_count: bigint;
    beneficiary_count: bigint;
  }>>(`
    SELECT 
      c.id,
      c.first_name,
      c.last_name,
      c.email,
      c.phone,
      c.date_of_birth,
      c.created_at,
      c.updated_at,
      COUNT(DISTINCT p.id)::bigint as policy_count,
      COUNT(DISTINCT b.id)::bigint as beneficiary_count
    FROM clients c
    LEFT JOIN policies p ON p.client_id = c.id
    LEFT JOIN beneficiaries b ON b.client_id = c.id
    WHERE c.id = $1
    GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone, c.date_of_birth, c.created_at, c.updated_at
    LIMIT 1
  `, clientId);

  if (!clientData || clientData.length === 0) {
    redirect("/error?type=not_found");
  }

  const clientRow = clientData[0];
  const client = {
    id: clientRow.id,
    firstName: clientRow.first_name,
    lastName: clientRow.last_name,
    email: clientRow.email,
    phone: clientRow.phone,
    dateOfBirth: clientRow.date_of_birth,
    createdAt: clientRow.created_at,
    updatedAt: clientRow.updated_at,
    _count: {
      policies: Number(clientRow.policy_count),
      beneficiaries: Number(clientRow.beneficiary_count),
    },
  };

  if (!client) {
    redirect("/error?type=not_found");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            {client.firstName} {client.lastName}
          </h1>
          <p className="text-sm text-slate-300">{client.email}</p>
          <p className="text-xs text-slate-400">
            Client ID: {client.id}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/clients">
            <Button variant="outline">Back</Button>
          </Link>

          <div className="flex items-center gap-2">
            <a
              href={`/api/clients/${client.id}/summary-pdf`}
              download
              className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Summary PDF
            </a>
            <a
              href={`/api/clients/${client.id}/probate-summary`}
              download
              className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Probate PDF
            </a>
          </div>

          <Link href={`/dashboard/clients/${client.id}/receipts-audit`}>
            <Button variant="outline">Receipts & Audit</Button>
          </Link>

          <Link href={`/dashboard/clients/${client.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>

          <Link href={`/dashboard/clients/${client.id}/policies/new`}>
            <Button size="lg">Add Policy</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="text-xs font-semibold text-slate-400">Policies</div>
          <div className="mt-2 text-3xl font-semibold text-slate-100">
            {client._count.policies}
          </div>
          <div className="mt-3">
            <Link href={`/dashboard/clients/${client.id}/policies`}>
              <Button variant="outline" size="sm">View Policies</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="text-xs font-semibold text-slate-400">Beneficiaries</div>
          <div className="mt-2 text-3xl font-semibold text-slate-100">
            {client._count.beneficiaries}
          </div>
          <div className="mt-3">
            <Link href={`/dashboard/clients/${client.id}/beneficiaries`}>
              <Button variant="outline" size="sm">View Beneficiaries</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="text-xs font-semibold text-slate-400">Registry status</div>
          <div className="mt-2 text-sm text-slate-200">
            Keep going: add policies + attach beneficiaries.
          </div>
          <div className="mt-3 flex gap-2">
            <Link href={`/dashboard/clients/${client.id}/beneficiaries/new`}>
              <Button variant="outline" size="sm">Add Beneficiary</Button>
            </Link>
            <Link href={`/dashboard/clients/${client.id}/policies/new`}>
              <Button size="sm">Add Policy</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
        <h2 className="text-sm font-semibold text-slate-100">Client information</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-200">
          <div><span className="text-slate-400">Phone:</span> {client.phone ?? "—"}</div>
          <div>
            <span className="text-slate-400">Date of birth:</span>{" "}
            {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : "—"}
          </div>
          <div><span className="text-slate-400">Created:</span> {new Date(client.createdAt).toLocaleString()}</div>
          <div><span className="text-slate-400">Updated:</span> {new Date(client.updatedAt).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
