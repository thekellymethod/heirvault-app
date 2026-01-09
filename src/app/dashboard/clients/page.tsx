import Link from "next/link";
import { notFound } from "next/navigation";
;
import { requireAuth } from "@/lib/utils/clerk";
// import { Button } from "@/components/ui/button";
import { EmptyListState } from "@/components/ui/empty-state";
import { CreateClientButton } from "@/components/CreateClientButton";

export default async function ClientsPage() {
  const user = await requireAuth();

  // Fetch clients via attorney_client_access join
  const { queryRaw } = await import("@/lib/db");
  
  let clientList: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    updatedAt: string;
    createdAt: string;
  }> = [];

  try {
    const accessRecords = await queryRaw<{
      client_id: string;
      client_firstName: string;
      client_lastName: string;
      client_email: string;
      client_phone: string | null;
      client_updatedAt: string;
      client_createdAt: string;
    }>(`
      SELECT 
        c.id as client_id,
        c."firstName" as client_firstName,
        c."lastName" as client_lastName,
        c.email as client_email,
        c.phone as client_phone,
        c."updatedAt" as client_updatedAt,
        c."createdAt" as client_createdAt
      FROM attorney_client_access aca
      INNER JOIN clients c ON c.id = aca."clientId"
      WHERE aca.attorney_id = $1 AND aca.is_active = true
      ORDER BY aca.granted_at DESC
    `, [user.id]);

    clientList = accessRecords.map((r) => ({
      id: r.client_id,
      firstName: r.client_firstName,
      lastName: r.client_lastName,
      email: r.client_email,
      phone: r.client_phone,
      updatedAt: r.client_updatedAt,
      createdAt: r.client_createdAt,
    }));
  } catch (error: unknown) {
    console.error("ClientsPage error:", error);
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Clients</h1>
          <p className="text-sm text-slateui-600">
            Create and manage client registry profiles.
          </p>
        </div>

        <CreateClientButton />
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
            {clientList.map((c: {
              id: string;
              firstName: string;
              lastName: string;
              email: string;
              phone: string | null;
              updatedAt: string;
              createdAt: string;
            }) => (
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
