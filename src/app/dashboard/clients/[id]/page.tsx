import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { Button } from "@/components/ui/button";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id: clientId } = await params;

  const access = await prisma.attorneyClientAccess.findFirst({
    where: { attorneyId: user.id, clientId, isActive: true },
    select: { id: true },
  });

  if (!access) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6">
        <h1 className="text-lg font-semibold text-slate-100">Forbidden</h1>
        <p className="mt-2 text-sm text-slate-300">
          You do not have access to this client.
        </p>
        <div className="mt-4">
          <Link href="/dashboard/clients">
            <Button variant="outline">Back to Clients</Button>
          </Link>
        </div>
      </div>
    );
  }

  const client = await prisma.client.findUnique({
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
      _count: { select: { policies: true, beneficiaries: true } },
    },
  });

  if (!client) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6">
        <h1 className="text-lg font-semibold text-slate-100">Client not found</h1>
        <div className="mt-4">
          <Link href="/dashboard/clients">
            <Button variant="outline">Back to Clients</Button>
          </Link>
        </div>
      </div>
    );
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
