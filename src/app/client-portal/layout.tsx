import { ReactNode } from "react"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function ClientPortalLayout({
  children,
}: {
  children: ReactNode
}) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      clientRecord: {
        include: {
          policies: {
            include: {
              insurer: true,
              beneficiaries: {
                include: {
                  beneficiary: true,
                },
              },
            },
          },
          beneficiaries: true,
        },
      },
    },
  })

  if (!user) redirect("/sign-in")

  if (user.role !== "client") {
    // Attorneys should not be in client portal
    redirect("/dashboard")
  }

  const client = user.clientRecord

  if (!client) {
    // You can build a "finish linking" page later
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm font-semibold">HeirVault</div>
            <div className="text-xs text-slate-400">
              Client Registry Portal
            </div>
          </div>
          <nav className="flex gap-4 text-xs text-slate-300">
            <Link href="/client-portal" className="hover:text-emerald-300">
              Overview
            </Link>
            <Link href="/client-portal/policies" className="hover:text-emerald-300">
              Policies
            </Link>
            <Link
              href="/client-portal/beneficiaries"
              className="hover:text-emerald-300"
            >
              Beneficiaries
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  )
}

