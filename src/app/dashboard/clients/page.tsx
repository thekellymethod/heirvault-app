import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function ClientsPage() {
  try {
    const user = await requireAuth();

    const rows = await prisma.attorneyClientAccess.findMany({
      where: { attorneyId: user.id, isActive: true },
      select: {
        grantedAt: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            updatedAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { grantedAt: "desc" },
    });

    const clients = rows.map((r) => r.client);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Clients</h1>
          <p className="text-sm text-slate-300">
            Create and manage client registry profiles.
          </p>
        </div>

        <Link href="/dashboard/clients/new">
          <Button size="lg">New Client</Button>
        </Link>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40">
        <div className="grid grid-cols-12 gap-2 border-b border-slate-800 px-4 py-3 text-xs font-semibold text-slate-400">
          <div className="col-span-4">Client</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-2">Phone</div>
          <div className="col-span-2 text-right">Updated</div>
        </div>

        {clients.length === 0 ? (
          <div className="px-4 py-8 text-sm text-slate-300">
            No clients yet. Create your first client profile.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {clients.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/clients/${c.id}`}
                className="block px-4 py-4 hover:bg-slate-900/40"
              >
                <div className="grid grid-cols-12 items-center gap-2">
                  <div className="col-span-4">
                    <div className="text-sm font-medium text-slate-100">
                      {c.firstName} {c.lastName}
                    </div>
                    <div className="text-xs text-slate-400">ID: {c.id}</div>
                  </div>
                  <div className="col-span-4 text-sm text-slate-200">{c.email}</div>
                  <div className="col-span-2 text-sm text-slate-200">
                    {c.phone ?? "—"}
                  </div>
                  <div className="col-span-2 text-right text-xs text-slate-400">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  } catch (error) {
    console.error("ClientsPage error:", error);
    // Don't redirect on error - let middleware handle authentication
    // If unauthorized, middleware will redirect to sign-in
    // Otherwise show error message
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Error</h1>
          <p className="text-sm text-slate-300">
            Failed to load clients. Please try refreshing the page.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }
}
