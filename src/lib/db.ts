// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton for Next.js (prevents exhausting DB connections in dev hot-reload)
 */
declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

/**
 * Re-export Prisma model types so existing imports can do:
 * import type { User, clients, policies } from "@/lib/db"
 */
export type {
  User,
  attorneyProfile,
  ApiToken,
  attorneyClientAccess,
  access_grants,
  audit_logs,
  beneficiaries,
  client_invites,
  clients,
  documents,
  insurers,
  invites,
  org_members,
  organizations,
  policies,
  policy_beneficiaries,
  AccessGrantStatus,
  AuditAction,
  BillingPlan,
  InviteStatus,
  OrgRole,
  UserRole,
  LicenseStatus,
} from "@prisma/client";

/**
 * Minimal, safe JSON type for app-level metadata fields.
 * (Avoids `{}` which ESLint correctly hates.)
 */
export type JsonObject = Record<string, unknown>;

/**
 * Lightweight DB health check used by /api/health or debug endpoints.
 */
export async function dbHealthCheck(): Promise<{
  ok: boolean;
  database: "connected" | "error";
  error?: string;
}> {
  try {
    // Works on Postgres, returns 1 row.
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, database: "connected" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, database: "error", error: msg };
  }
}

/**
 * Return the attorney's authorized clients (based on attorney_client_access table).
 * - If you pass orgId, it scopes to that org membership.
 */
export async function listAuthorizedClients(input: {
  attorneyUserId: string;
  orgId?: string | null;
  limit?: number;
}) {
  const limit = input.limit ?? 50;

  const rows = await prisma.attorneyClientAccess.findMany({
    where: {
      attorneyId: input.attorneyUserId,
      isActive: true,
      ...(input.orgId ? { organizationId: input.orgId } : {}),
    },
    orderBy: { grantedAt: "desc" },
    take: limit,
    include: {
      clients: true,
      organizations: true,
    },
  });

  // Return just the client records, plus a little access context if you want it.
  return rows.map((r) => ({
    client: r.clients,
    access: {
      id: r.id,
      grantedAt: r.grantedAt,
      revokedAt: r.revokedAt,
      isActive: r.isActive,
      organizationId: r.organizationId,
    },
    organization: r.organizations ?? null,
  }));
}

/**
 * Get a client, but only if the attorney has active access.
 */
export async function getAuthorizedClientById(input: {
  attorneyUserId: string;
  clientId: string;
  orgId?: string | null;
}) {
  const access = await prisma.attorneyClientAccess.findFirst({
    where: {
      attorneyId: input.attorneyUserId,
      clientId: input.clientId,
      isActive: true,
      ...(input.orgId ? { organizationId: input.orgId } : {}),
    },
    include: {
      clients: true,
    },
  });

  return access?.clients ?? null;
}

/**
 * Create a client safely (won't crash on duplicate email).
 * - If the email already exists, returns the existing client.
 *
 * IMPORTANT: Your schema enforces clients.email unique.
 */
export async function createOrGetClientByEmail(input: {
  email: string;
  firstName: string;
  lastName: string;
  orgId?: string | null;
  phone?: string | null;
}) {
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.clients.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.clients.create({
    data: {
      id: crypto.randomUUID(),
      email,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone ?? null,
      orgId: input.orgId ?? null,
    },
  });
}

/**
 * Audit log helper (schema: audit_logs.message is required, action is enum).
 */
export async function writeAuditLog(input: {
  action: "CLIENT_CREATED" | "CLIENT_UPDATED" | "POLICY_CREATED" | "POLICY_UPDATED" | "DOCUMENT_UPLOADED" | "DOCUMENT_PROCESSED" | "CLIENT_VIEWED" | "INVITE_CREATED" | "INVITE_ACCEPTED" | "ATTORNEY_VERIFIED" | "API_TOKEN_CREATED" | "API_TOKEN_REVOKED" | "API_TOKEN_ROTATED" | "API_TOKEN_USED" | "CLIENT_SUMMARY_PDF_DOWNLOADED" | "POLICY_SEARCH_PERFORMED" | "GLOBAL_POLICY_SEARCH_PERFORMED" | "BENEFICIARY_CREATED" | "BENEFICIARY_UPDATED";
  message: string;
  userId?: string | null;
  orgId?: string | null;
  clientId?: string | null;
  policyId?: string | null;
}) {
  await prisma.audit_logs.create({
    data: {
      id: crypto.randomUUID(),
      action: input.action,
      message: input.message,
      userId: input.userId ?? null,
      orgId: input.orgId ?? null,
      clientId: input.clientId ?? null,
      policyId: input.policyId ?? null,
    },
  });
}
