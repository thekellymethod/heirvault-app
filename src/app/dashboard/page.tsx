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

type RedirectError = { redirectTo: string };

function isRedirectError(error: unknown): error is RedirectError {
  if (typeof error !== "object" || error === null) return false;
  const e = error as Record<string, unknown>;
  return typeof e.redirectTo === "string";
}

/**
 * UI-only derived status (since DB may not have a verificationStatus column)
 * Keep this deterministic and conservative.
 */
function deriveVerificationStatus(input: {
  insurerId: string | null;
  carrierConfidence: number | null;
  carrierNameRaw: string | null;
}): VerificationStatus {
  const raw = (input.carrierNameRaw ?? "").trim();
  const conf = input.carrierConfidence ?? null;

  if (!input.insurerId) {
    if (raw.length > 0) return "DISCREPANCY";
    return "PENDING";
  }

  if (conf !== null && conf < 0.6) return "DISCREPANCY";
  return "VERIFIED";
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

  const policiesRows = await prisma.policies.findMany({
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

      // Relations (use Prisma client field names)
      clients: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },

      // If your Prisma schema relation field is NOT "insurers", rename this to "insurer"
      insurers: {
        select: {
          id: true,
          name: true,
        },
      },

      _count: {
        select: { documents: true },
      },
    },
  });

  const policies: DashboardPolicyVM[] = policiesRows.map((p) => {
    const insurer =
      p.insurers && typeof p.insurers.id === "string" && typeof p.insurers.name === "string"
        ? { id: p.insurers.id, name: p.insurers.name }
        : null;

    const verificationStatus = deriveVerificationStatus({
      insurerId: p.insurerId ?? null,
      carrierConfidence: p.carrierConfidence ?? null,
      carrierNameRaw: p.carrierNameRaw ?? null,
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
      insurer,
      documentCount: p._count.documents,
    };
  });

  const [totalPolicies, totalClients] = await Promise.all([
    prisma.policies.count(),
    prisma.clients.count(),
  ]);

  // Stats derived from the 10 rows we fetched (DB has no verificationStatus field)
  const counts = new Map<VerificationStatus, number>();
  for (const s of VERIFICATION_STATUSES) counts.set(s, 0);
  for (const p of policies) counts.set(p.verificationStatus, (counts.get(p.verificationStatus) ?? 0) + 1);

  const stats: DashboardStatsVM = {
    totalPolicies,
    pendingVerification: counts.get("PENDING") ?? 0,
    verified: counts.get("VERIFIED") ?? 0,
    discrepancy: counts.get("DISCREPANCY") ?? 0,
    totalClients,
  };

  return <AttorneyDashboardView policies={policies} stats={stats} />;
}
