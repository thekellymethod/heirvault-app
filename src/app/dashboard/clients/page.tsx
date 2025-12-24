import Link from "next/link";
import { notFound } from "next/navigation";
import { db, attorneyClientAccess, clients, eq, desc, and } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { Button } from "@/components/ui/button";
import { EmptyListState } from "@/components/ui/empty-state";

export default async function ClientsPage() {
  const user = await requireAuth();

  // Use Drizzle ORM to fetch clients
  const rows = await db
    .select({
      grantedAt: attorneyClientAccess.grantedAt,
      id: clients.id,
      firstName: clients.firstName,
      lastName: clients.lastName,
      email: clients.email,
      phone: clients.phone,
      updatedAt: clients.updatedAt,
      createdAt: clients.createdAt,
    })
    .from(attorneyClientAccess)
    .innerJoin(clients, eq(attorneyClientAccess.clientId, clients.id))
    .where(
      and(
        eq(attorneyClientAccess.attorneyId, user.id),
        eq(attorneyClientAccess.isActive, true)
      )
    )
    .orderBy(desc(attorneyClientAccess.grantedAt))
    .catch((error) => {
      console.error("ClientsPage error:", error);
      return null;
    });

  if (!rows) notFound();

  const clientList = rows.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email,
    phone: r.phone,
    updatedAt: r.updatedAt,
    createdAt: r.createdAt,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Clients</h1>
          <p className="text-sm text-slateui-600">
            Create and manage client registry profiles.
          </p>
        </div>

        <Link href="/dashboard/clients/new">
          <Button size="lg">New Client</Button>
        </Link>
      </div>

      <div className="rounded-xl border border-slateui-200 bg-white overflow-x-auto">
        <div className="grid grid-cols-12 gap-2 border-b border-slateui-200 px-4 py-3 text-xs font-semibold text-ink-900 min-w-[800px]">
          <div className="col-span-4">Client</div>
          <div className="col-span-4 hidden md:block">Email</div>
          <div className="col-span-2 hidden sm:block">Phone</div>
          <div className="col-span-2 text-right">Updated</div>
        </div>

        {clientList.length === 0 ? (
          <EmptyListState
            icon="Users"
            title="No clients yet"
            description="Get started by creating your first client profile. Clients can then be invited to complete their life insurance registry."
            action={{
              label: "Create Client",
              href: "/dashboard/clients/new",
            }}
          />
        ) : (
          <div className="divide-y divide-slateui-200">
            {clientList.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/clients/${c.id}`}
                className="block px-4 py-4 hover:bg-slateui-50"
              >
                <div className="grid grid-cols-12 items-center gap-2 min-w-[800px]">
                  <div className="col-span-4">
                    <div className="text-sm font-medium text-ink-900">
                      {c.firstName} {c.lastName}
                    </div>
                    <div className="text-xs text-slateui-600 hidden sm:block">ID: {c.id.substring(0, 8)}...</div>
                    <div className="text-xs text-slateui-600 sm:hidden">{c.email}</div>
                  </div>
                  <div className="col-span-4 text-sm text-ink-900 hidden md:block">{c.email}</div>
                  <div className="col-span-2 text-sm text-ink-900 hidden sm:block">
                    {c.phone ?? "—"}
                  </div>
                  <div className="col-span-2 text-right text-xs text-slateui-600">
                    <span className="hidden sm:inline">{new Date(c.updatedAt).toLocaleDateString()}</span>
                    <span className="sm:hidden">{new Date(c.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
