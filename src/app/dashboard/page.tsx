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

function isVerificationStatus(value: unknown): value is VerificationStatus {
  return (
    typeof value === "string" &&
    (VERIFICATION_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Derive a UI status from what your DB actually has today.
 * Adjust logic as your real verification flow matures.
 */
function deriveVerificationStatus(input: {
  insurerId: string | null;
  carrierConfidence: number | null;
  carrierNameRaw: string | null;
  documentCount: number;
}): VerificationStatus {
  // No documents -> incomplete data intake
  if (input.documentCount <= 0) return "INCOMPLETE";

  // OCR saw *something* but it didn't resolve to a known insurer
  if (!input.insurerId) {
    if ((input.carrierNameRaw ?? "").trim().length > 0) return "DISCREPANCY";
    return "PENDING";
  }

  // Low confidence carrier match -> needs review
  const conf = input.carrierConfidence;
  if (conf !== null && conf < 0.6) return "DISCREPANCY";

  return "VERIFIED";
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

  // Pull recent policies + related info using the relation names from YOUR schema
  const policyRows = await prisma.policies.findMany({
    take: 10,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      insurerId: true,
      policyNumber: true,
      policyType: true,
      createdAt: true,
      updatedAt: true,
      carrierConfidence: true,
      carrierNameRaw: true,

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

      _count: {
        select: {
          documents: true,
        },
      },
    },
  });

  const policies: DashboardPolicyVM[] = policyRows.map((p: typeof policyRows[0]) => {
    const documentCount = p._count.documents;

    const verificationStatus = deriveVerificationStatus({
      insurerId: p.insurerId ?? null,
      carrierConfidence: p.carrierConfidence ?? null,
      carrierNameRaw: p.carrierNameRaw ?? null,
      documentCount,
    });

    return {
      id: p.id,
      policyNumber: p.policyNumber ?? null,
      policyType: p.policyType ?? null,
      verificationStatus,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
      client: {
        id: p.clients.id,
        firstName: p.clients.firstName ?? "",
        lastName: p.clients.lastName ?? "",
        email: p.clients.email,
      },
      insurer: p.insurers ? { id: p.insurers.id, name: p.insurers.name } : null,
      documentCount,
    };
  });

  // Stats: since verificationStatus is UI-only, derive counts in code.
  const [totalPolicies, totalClients] = await Promise.all([
    prisma.policies.count(),
    prisma.clients.count(),
  ]);

  const counts = new Map<VerificationStatus, number>();
  for (const s of VERIFICATION_STATUSES) counts.set(s, 0);

  for (const p of policies) {
    const s = isVerificationStatus(p.verificationStatus) ? p.verificationStatus : "PENDING";
    counts.set(s, (counts.get(s) ?? 0) + 1);
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
