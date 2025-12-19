import { auth, currentUser } from "@clerk/nextjs/server";
import { getCurrentUser } from "@/lib/utils/clerk";
import { prisma } from "@/lib/db";

export default async function TestAuthPage() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
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
  
  const userWithOrg = dbUser ? await prisma.user.findUnique({
    where: { id: dbUser.id },
    include: {
      orgMemberships: {
        include: {
          organizations: true,
        },
      },
    },
  }) : null;

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-slate-900">Auth Debug Page</h1>
      
      <div className="space-y-4">
        <div className="bg-slate-100 p-4 rounded">
          <h2 className="font-semibold mb-2 text-slate-900">Clerk Auth</h2>
          <pre className="text-sm overflow-auto text-slate-800">
            {JSON.stringify({
              userId,
              clerkEmail: clerkUser?.emailAddresses?.[0]?.emailAddress,
              clerkRole: (clerkUser?.publicMetadata as any)?.role,
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-slate-100 p-4 rounded">
          <h2 className="font-semibold mb-2 text-slate-900">Database User</h2>
          {dbUser ? (
            <pre className="text-sm overflow-auto text-slate-800">
              {JSON.stringify({
                id: dbUser.id,
                email: dbUser.email,
                role: dbUser.role,
                clerkId: dbUser.clerkId,
                firstName: dbUser.firstName,
                lastName: dbUser.lastName,
              }, null, 2)}
            </pre>
          ) : (
            <div className="text-red-600 font-semibold">
              ⚠️ User not found in database! This is the problem.
              <br />
              <span className="text-sm font-normal">getCurrentUser() should create the user automatically.</span>
            </div>
          )}
        </div>

        <div className="bg-slate-100 p-4 rounded">
          <h2 className="font-semibold mb-2 text-slate-900">Organization</h2>
          <pre className="text-sm overflow-auto text-slate-800">
            {JSON.stringify({
              hasOrg: !!(userWithOrg?.orgMemberships && userWithOrg.orgMemberships.length > 0),
              orgName: userWithOrg?.orgMemberships?.[0]?.organizations?.name,
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-blue-100 p-4 rounded">
          <h2 className="font-semibold mb-2 text-slate-900">What Should Happen:</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-800">
            <li>All accounts are attorney accounts → Should access /dashboard</li>
            <li>If no role → Should go to /attorney/sign-in/complete</li>
            <li>If attorney but no org → Should go to /attorney/onboard</li>
            <li>Clients don't need accounts - they use invitation links at /invite/[token]</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-4">
          <a 
            href="/dashboard" 
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Try Dashboard
          </a>
          <a 
            href="/attorney/sign-up" 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Attorney Sign Up
          </a>
          <a 
            href="/api/debug/user-info" 
            className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
            target="_blank"
          >
            API Debug Info
          </a>
          <form action="/api/debug/create-user" method="POST" className="inline">
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Force Create/Update User
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

