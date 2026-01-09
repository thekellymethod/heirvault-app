import { auth, currentUser } from "@clerk/nextjs/server";
import { getCurrentUser } from "@/lib/utils/clerk";
import { notFound } from "next/navigation";

export default async function TestAuthPage() {
  // Only available in development mode
  if (process.env.NODE_ENV === "production") {
    // Return 404 in production
    notFound();
  }

  const { userId } = await auth();
  const clerkUser = await currentUser();
  const dbUser = await getCurrentUser();

  let userWithOrg: {
    id: string;
    orgMemberships: Array<{
      id: string;
      organizations: {
        id: string;
        name: string;
      };
    }>;
  } | null = null;

  if (dbUser) {
    try {
      const { queryRaw } = await import("@/lib/db");

      type UserWithOrgRow = {
        user_id: string;
        membership_id: string;
        org_id: string;
        org_name: string;
      };

      const orgMembershipsResult = await queryRaw<UserWithOrgRow>(`
        SELECT
          u.id as user_id,
          om.id as membership_id,
          o.id as org_id,
          o.name as org_name
        FROM users u
        LEFT JOIN org_members om ON om.user_id = u.id
        LEFT JOIN organizations o ON o.id = om.organization_id
        WHERE u.id = $1
      `, [dbUser.id]);

      if (orgMembershipsResult && orgMembershipsResult.length > 0) {
        // Group memberships by user and organization
        const membershipsMap = new Map<string, { id: string; organizations: { id: string; name: string } }>();
        
        for (const row of orgMembershipsResult) {
          if (row.membership_id && row.org_id) {
            membershipsMap.set(row.membership_id, {
              id: row.membership_id,
              organizations: {
                id: row.org_id,
                name: row.org_name,
              },
            });
          }
        }

        userWithOrg = {
          id: dbUser.id,
          orgMemberships: Array.from(membershipsMap.values()),
        };
      } else {
        userWithOrg = {
          id: dbUser.id,
          orgMemberships: [],
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Test auth page: Failed to load user with org:", errorMessage);
      userWithOrg = {
        id: dbUser.id,
        orgMemberships: [],
      };
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-slate-900">Auth Debug Page</h1>

      <div className="space-y-4">
        <div className="bg-slate-100 p-4 rounded">
          <h2 className="font-semibold mb-2 text-slate-900">Clerk Auth</h2>
          <pre className="text-sm overflow-auto text-slate-800">
            {JSON.stringify(
              {
                userId,
                clerkEmail: clerkUser?.emailAddresses?.[0]?.emailAddress ?? null,
              },
              null,
              2
            )}
          </pre>
        </div>

        <div className="bg-slate-100 p-4 rounded">
          <h2 className="font-semibold mb-2 text-slate-900">Database User</h2>
          {dbUser ? (
            <pre className="text-sm overflow-auto text-slate-800">
              {JSON.stringify(
                {
                  id: dbUser.id,
                  email: dbUser.email,
                  role: dbUser.role,
                  clerkId: dbUser.clerkId,
                  firstName: dbUser.firstName,
                  lastName: dbUser.lastName,
                },
                null,
                2
              )}
            </pre>
          ) : (
            <div className="text-red-600 font-semibold">
              ⚠️ User not found in database!
            </div>
          )}
        </div>

        <div className="bg-slate-100 p-4 rounded">
          <h2 className="font-semibold mb-2 text-slate-900">Organization</h2>
          <pre className="text-sm overflow-auto text-slate-800">
            {JSON.stringify(
              {
                hasOrg: Boolean(userWithOrg?.orgMemberships?.length),
                orgName: userWithOrg?.orgMemberships?.[0]?.organizations?.name ?? null,
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
