import { auth, currentUser } from "@clerk/nextjs/server";
import { getCurrentUser } from "@/lib/utils/clerk";
import { prisma } from "@/lib/db";

export default async function TestAuthPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="p-8 max-w-4xl mx-auto bg-white min-h-screen">
        <h1 className="text-2xl font-bold mb-4 text-slate-900">Access Denied</h1>
        <p className="text-slate-600">This page is only available in development mode.</p>
      </div>
    );
  }

  const { userId } = await auth();
  const clerkUser = await currentUser();
  const dbUser = await getCurrentUser();

  const userWithOrg = dbUser
    ? await prisma.user.findUnique({
        where: { id: dbUser.id },
        include: {
          orgMemberships: {
            include: { organizations: true },
          },
        },
      })
    : null;

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
