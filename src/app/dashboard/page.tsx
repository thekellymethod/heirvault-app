import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/utils/clerk'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  if (user.role === 'attorney') {
    // Get clients for attorney
    const access = await prisma.attorneyClientAccess.findMany({
      where: {
        attorneyId: user.id,
        isActive: true,
      },
      include: {
        client: true,
      },
    })

    // Get policy and beneficiary counts for each client
    const clientSummaries = await Promise.all(
      access.map(async (accessRecord) => {
        const client = accessRecord.client
        if (!client) return null

        const [policyCount, beneficiaryCount] = await Promise.all([
          prisma.policy.count({
            where: { clientId: client.id },
          }),
          prisma.beneficiary.count({
            where: { clientId: client.id },
          }),
        ])

        return {
          client: {
            id: client.id,
            email: client.email,
            firstName: client.firstName,
            lastName: client.lastName,
            createdAt: client.createdAt,
          },
          policyCount,
          beneficiaryCount,
          hasPolicies: policyCount > 0,
        }
      })
    )

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Attorney Dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Welcome back, {user.firstName || user.email}
            </p>
          </div>

          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Your Clients
            </h2>
            <Link
              href="/dashboard/clients/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Client
            </Link>
          </div>

          {clientSummaries.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">
                No clients yet. Invite a client to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clientSummaries.map((summary: any) => (
                <Link
                  key={summary.client.id}
                  href={`/dashboard/clients/${summary.client.id}`}
                  className="rounded-lg border border-gray-200 bg-white p-6 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {summary.client.firstName} {summary.client.lastName}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {summary.client.email}
                  </p>
                  <div className="mt-4 flex gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {summary.policyCount}
                      </span>
                      <span className="ml-1 text-gray-600 dark:text-gray-400">
                        {summary.policyCount === 1 ? 'Policy' : 'Policies'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {summary.beneficiaryCount}
                      </span>
                      <span className="ml-1 text-gray-600 dark:text-gray-400">
                        {summary.beneficiaryCount === 1 ? 'Beneficiary' : 'Beneficiaries'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Client view
  const client = await prisma.client.findUnique({
    where: { userId: user.id },
  })

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              My Registry
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Welcome back, {user.firstName || user.email}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-gray-600 dark:text-gray-400">
              No client record found. Please contact your attorney or accept an invitation.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const [policies, beneficiaries] = await Promise.all([
    prisma.policy.findMany({
      where: { clientId: client.id },
      include: {
        insurer: true,
        beneficiaries: {
          include: {
            beneficiary: true,
          },
        },
      },
    }),
    prisma.beneficiary.findMany({
      where: { clientId: client.id },
    }),
  ])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Registry
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Welcome back, {user.firstName || user.email}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Policies
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {policies?.length || 0} {policies?.length === 1 ? 'policy' : 'policies'} recorded
            </p>
            <Link
              href="/dashboard/policies/new"
              className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Add Policy →
            </Link>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Beneficiaries
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {beneficiaries?.length || 0} {beneficiaries?.length === 1 ? 'beneficiary' : 'beneficiaries'} recorded
            </p>
            <Link
              href="/dashboard/beneficiaries/new"
              className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Add Beneficiary →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

