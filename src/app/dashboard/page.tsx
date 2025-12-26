import { prisma } from "@/lib/db";
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import { AttorneyDashboardView } from "./_components/AttorneyDashboardView";

/* -----------------------------
   Verification status (UI-only)
------------------------------ */

const VERIFICATION_STATUSES = [
  "PENDING",
  "VERIFIED",
  "DISCREPANCY",
  "INCOMPLETE",
  "REJECTED",
] as const;

type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

function asVerificationStatus(value: unknown): VerificationStatus {
  if (typeof value !== "string") return "PENDING";
  return (VERIFICATION_STATUSES as readonly string[]).includes(value)
    ? (value as VerificationStatus)
    : "PENDING";
}

/* -----------------------------
   Redirect error guard
------------------------------ */

type RedirectError = { redirectTo: string };

function isRedirectError(error: unknown): error is RedirectError {
  if (typeof error !== "object" || error === null) return false;
  const e = error as Record<string, unknown>;
  return typeof e.redirectTo === "string";
}

/* -----------------------------
   View-model types
------------------------------ */

type DashboardPolicyVM = {
  id: string;
  policyNumber: string | null;
  policyType: string | null;
  verificationStatus: VerificationStatus;
  updatedAt: Date;
  createdAt: Date;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  insurer: {
    id: string;
    name: string;
  } | null;
  documentCount: number;
};

type DashboardStatsVM = {
  totalPolicies: number;
  pendingVerification: number;
  verified: number;
  discrepancy: number;
  totalClients: number;
};

/* -----------------------------
   Dashboard Page
------------------------------ */

export default async function DashboardPage() {
  // Auth gate
  try {
    await requireVerifiedAttorney();
  } catch (error: unknown) {
    if (isRedirectError(error)) redirect(error.redirectTo);
    redirect("/attorney/apply");
  }

  /**
   * DB-SAFE RULE:
   * Only select what you *know* exists in the physical database.
   *
   * If you still get P2022 after this, the mismatch is inside the `policies`
   * table itself (or your connection points to an older DB). Then you must
   * run migrations / introspection to reconcile.
   */
  const policiesRows = await prisma.policies.findMany({
    take: 10,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      clientId: true,
      insurerId: true,
      policyNumber: true,
      policyType: true,
      verificationStatus: true,
      createdAt: true,
      updatedAt: true,

      // Relations (camelCase per Prisma Client types)
      clients: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },

      insurers: {
        select: {
          id: true,
          name: true,
        },
      },

      // Document count via relation count
      _count: {
        select: {
          documents: true,
        },
      },
    },
  });

  const policies: DashboardPolicyVM[] = policiesRows.map((p) => {
    const insurer =
      p.insurers && typeof p.insurers.id === "string" && typeof p.insurers.name === "string"
        ? { id: p.insurers.id, name: p.insurers.name }
        : null;

    return {
      id: p.id,
      policyNumber: p.policyNumber ?? null,
      policyType: p.policyType ?? null,
      verificationStatus: asVerificationStatus(p.verificationStatus),
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
      client: {
        id: p.clients.id,
        firstName: p.clients.firstName ?? "",
        lastName: p.clients.lastName ?? "",
        email: p.clients.email,
      },
      insurer,
      documentCount: p._count.documents,
    };
  });

  // Stats
  const [totalPolicies, totalClients, verificationCounts] = await Promise.all([
    prisma.policies.count(),
    prisma.clients.count(),
    prisma.policies.groupBy({
      by: ["verificationStatus"],
      _count: { _all: true },
    }),
  ]);

  const counts = new Map<string, number>();
  for (const row of verificationCounts) {
    const key = row.verificationStatus ?? "PENDING";
    counts.set(key, row._count._all);
  }

  const stats: DashboardStatsVM = {
    totalPolicies,
    pendingVerification: counts.get("PENDING") ?? 0,
    verified: counts.get("VERIFIED") ?? 0,
    discrepancy: counts.get("DISCREPANCY") ?? 0,
    totalClients,
  };

  return <AttorneyDashboardView policies={policies} stats={stats} />;
}