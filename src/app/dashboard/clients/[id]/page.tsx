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

  // Get client data using Prisma
  const clientData = await prisma.clients.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          policies: true,
          beneficiaries: true,
        },
      },
    },
  });

  if (!clientData) {
    redirect("/error?type=not_found");
  }

  const client = {
    id: clientData.id,
    firstName: clientData.firstName,
    lastName: clientData.lastName,
    email: clientData.email,
    phone: clientData.phone,
    dateOfBirth: clientData.dateOfBirth,
    createdAt: clientData.createdAt,
    updatedAt: clientData.updatedAt,
    _count: {
      policies: clientData._count.policies,
      beneficiaries: clientData._count.beneficiaries,
    },
  };

  if (!client) {
    redirect("/error?type=not_found");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">
            {client.firstName} {client.lastName}
          </h1>
          <p className="text-sm text-slateui-600">{client.email}</p>
          <p className="text-xs text-slateui-600">
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
              className="inline-flex items-center justify-center rounded-lg border border-slateui-300 bg-white px-4 py-2 text-sm font-medium text-ink-900 hover:bg-slateui-50 transition-colors"
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
              className="inline-flex items-center justify-center rounded-lg border border-slateui-300 bg-white px-4 py-2 text-sm font-medium text-ink-900 hover:bg-slateui-50 transition-colors"
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
        <div className="rounded-xl border border-slateui-200 bg-white p-5">
          <div className="text-xs font-semibold text-slateui-600">Policies</div>
          <div className="mt-2 text-3xl font-semibold text-ink-900">
            {client._count.policies}
          </div>
          <div className="mt-3">
            <Link href={`/dashboard/clients/${client.id}/policies`}>
              <Button variant="outline" size="sm">View Policies</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slateui-200 bg-white p-5">
          <div className="text-xs font-semibold text-slateui-600">Beneficiaries</div>
          <div className="mt-2 text-3xl font-semibold text-ink-900">
            {client._count.beneficiaries}
          </div>
          <div className="mt-3">
            <Link href={`/dashboard/clients/${client.id}/beneficiaries`}>
              <Button variant="outline" size="sm">View Beneficiaries</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slateui-200 bg-white p-5">
          <div className="text-xs font-semibold text-slateui-600">Registry status</div>
          <div className="mt-2 text-sm text-ink-900">
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

      <div className="rounded-xl border border-slateui-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">Client information</h2>
        <div className="mt-3 grid gap-2 text-sm text-ink-900">
          <div><span className="text-slateui-600">Phone:</span> {client.phone ?? "—"}</div>
          <div>
            <span className="text-slateui-600">Date of birth:</span>{" "}
            {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : "—"}
          </div>
          <div><span className="text-slateui-600">Created:</span> {new Date(client.createdAt).toLocaleString()}</div>
          <div><span className="text-slateui-600">Updated:</span> {new Date(client.updatedAt).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
