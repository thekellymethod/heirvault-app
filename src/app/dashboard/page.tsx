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
  if (
    typeof value === "string" &&
    (VERIFICATION_STATUSES as readonly string[]).includes(value)
  ) {
    return value as VerificationStatus;
  }
  return "PENDING";
}

/* -----------------------------
   Type-safe redirect error guard
------------------------------ */

type RedirectError = {
  redirectTo: string;
};

function isRedirectError(error: unknown): error is RedirectError {
  return (
    typeof error === "object" &&
    error !== null &&
    "redirectTo" in error &&
    typeof (error as { redirectTo: unknown }).redirectTo === "string"
  );
}

/* -----------------------------
   Dashboard Page
------------------------------ */

export default async function DashboardPage() {
  // Authentication / authorization gate
  try {
    await requireVerifiedAttorney();
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      redirect(error.redirectTo);
    }
    redirect("/attorney/apply");
  }

  /* -----------------------------
     Fetch policies (DB-safe only)
  ------------------------------ */

  const policiesData = await prisma.policies.findMany({
    take: 1,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      clientId: true,
      insurerId: true,
      policyNumber: true,
      policyType: true,
      updatedAt: true,
      clients: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      insurers: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  /* -----------------------------
     Document counts (one query)
  ------------------------------ */

  const policyIds = policiesData.map((p) => p.id);

  const documentCounts =
    policyIds.length > 0
      ? await prisma.documents.groupBy({
          by: ["policyId"],
          where: { policyId: { in: policyIds } },
          _count: { _all: true },
        })
      : [];

  const documentCountByPolicyId = new Map<string, number>();
  for (const row of documentCounts) {
    if (row.policyId) {
      documentCountByPolicyId.set(row.policyId, row._count._all);
    }
  }

  /* -----------------------------
     Shape data for the view
  ------------------------------ */

  const policies = policiesData.map((p) => {
    const client = p.clients;
    if (!client) {
      throw new Error(`Client not found for policy ${p.id}`);
    }

    return {
      id: p.id,
      policyNumber: p.policyNumber ?? null,
      policyType: p.policyType ?? null,
      verificationStatus: asVerificationStatus("PENDING"),
      updatedAt: p.updatedAt,
      createdAt: p.updatedAt, // safe placeholder until DB mapping is finalized
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
      },
      insurer: {
        id: p.insurers?.id ?? "",
        name: p.insurers?.name ?? "",
      },
      documentCount: documentCountByPolicyId.get(p.id) ?? 0,
    };
  });

  /* -----------------------------
     Summary stats (DB-safe)
  ------------------------------ */

  const [totalPolicies, totalClients] = await Promise.all([
    prisma.policies.count(),
    prisma.clients.count(),
  ]);

  const stats = {
    totalPolicies,
    pendingVerification: totalPolicies,
    verified: 0,
    discrepancy: 0,
    totalClients,
  };

  return (
    <AttorneyDashboardView
      policies={policies}
      stats={stats}
    />
  );
}
