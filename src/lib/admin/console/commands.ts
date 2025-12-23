import "server-only";
import { prisma } from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabase";

// If your guards return this shape already, keep it.
// Otherwise adjust fields to match your AppUser type.
export type AdminActor = {
  id: string;       // Prisma User.id
  clerkId: string;  // Clerk user id
  email: string;
  roles: string[];
};

export type ConsoleContext = {
  actor: AdminActor;
};

export type ConsoleResult =
  | { ok: true; data: any }
  | { ok: false; error: string; details?: any };

export type CommandDef = {
  id: string;
  title: string;
  description: string;
  usage: string;
  // args is always an object; UI sends JSON-ish.
  handler: (ctx: ConsoleContext, args: Record<string, any>) => Promise<ConsoleResult>;
};

function requireString(args: Record<string, any>, key: string) {
  const v = args?.[key];
  if (typeof v !== "string" || !v.trim()) throw new Error(`Missing/invalid argument: ${key}`);
  return v.trim();
}

function requireNumber(args: Record<string, any>, key: string) {
  const v = args?.[key];
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error(`Missing/invalid argument: ${key}`);
  return n;
}

/**
 * NOTE: All commands must be safe, scoped, and auditable.
 * No arbitrary SQL. No shell. No filesystem. No env dumps.
 */
export const COMMANDS: CommandDef[] = [
  {
    id: "help",
    title: "Help",
    description: "List available commands and usage.",
    usage: "help",
    handler: async () => {
      return {
        ok: true,
        data: COMMANDS.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          usage: c.usage,
        })),
      };
    },
  },

  {
    id: "auth:whoami",
    title: "Who am I",
    description: "Show the current authenticated admin actor.",
    usage: "auth:whoami",
    handler: async (ctx) => ({ ok: true, data: ctx.actor }),
  },

  {
    id: "db:health",
    title: "DB Health",
    description: "Checks Prisma connectivity with a few lightweight reads.",
    usage: "db:health",
    handler: async () => {
      try {
        const started = Date.now();
        const [users, orgs] = await Promise.all([
          prisma.user.count(),
          prisma.organizations.count(),
        ]);
        // Note: clients table is in Drizzle/Supabase, not Prisma
        // We'll use a raw query to check if it exists
        const clientsCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*) as count FROM clients LIMIT 1`
        ).catch(() => [{ count: BigInt(0) }]);
        return {
          ok: true,
          data: {
            prisma: "ok",
            latencyMs: Date.now() - started,
            counts: { 
              users, 
              orgs, 
              clients: Number(clientsCount[0]?.count || 0) 
            },
          },
        };
      } catch (e: any) {
        return { ok: false, error: "Prisma health check failed.", details: { message: e?.message } };
      }
    },
  },

  {
    id: "migrations:status",
    title: "Migrations status",
    description: "Read migration entries (read-only).",
    usage: "migrations:status { limit?: number }",
    handler: async (_ctx, args) => {
      const limit = Math.min(Math.max(args?.limit ? requireNumber(args, "limit") : 25, 1), 200);
      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, checksum, finished_at, migration_name, logs, applied_steps_count
        FROM "_prisma_migrations"
        ORDER BY finished_at DESC NULLS LAST
        LIMIT ${limit};
      `);
      return { ok: true, data: rows };
    },
  },

  {
    id: "attorney:lookup",
    title: "Attorney lookup",
    description: "Lookup user + attorney profile by email.",
    usage: "attorney:lookup { email: string }",
    handler: async (_ctx, args) => {
      const email = requireString(args, "email").toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          clerkId: true,
          email: true,
          roles: true,
          firstName: true,
          lastName: true,
          attorneyProfile: {
            select: {
              id: true,
              licenseStatus: true,
              verifiedAt: true,
              appliedAt: true,
            },
          },
        },
      });

      if (!user) return { ok: false, error: `No user found for email: ${email}` };
      return { ok: true, data: user };
    },
  },

  {
    id: "attorney:verify",
    title: "Verify attorney",
    description: "Activate attorney profile and add ATTORNEY role.",
    usage: "attorney:verify { userId: string }",
    handler: async (ctx, args) => {
      const userId = requireString(args, "userId");

      const updated = await prisma.$transaction(async (tx: any) => {
        // Ensure profile exists
        const prof = await tx.attorneyProfile.upsert({
          where: { userId },
          update: {
            licenseStatus: "ACTIVE",
            verifiedAt: new Date(),
          },
          create: {
            userId,
            licenseStatus: "ACTIVE",
            verifiedAt: new Date(),
          },
          select: { id: true, userId: true, licenseStatus: true, verifiedAt: true },
        });

        // Add role
        const u = await tx.user.findUnique({ where: { id: userId }, select: { roles: true } });
        const roles = Array.from(new Set([...(u?.roles ?? ["USER"]), "ATTORNEY"]));

        await tx.user.update({
          where: { id: userId },
          data: { roles },
          select: { id: true },
        });

        // Audit
        await tx.audit_logs.create({
          data: {
            id: crypto.randomUUID(),
            user_id: ctx.actor.id,
            action: "INVITE_ACCEPTED", // If you want a dedicated action, add it to enum later.
            message: `Admin console verified attorney userId=${userId}`,
            created_at: new Date(),
          },
        });

        return { profile: prof, roles };
      });

      return { ok: true, data: updated };
    },
  },

  {
    id: "attorney:revoke",
    title: "Revoke attorney",
    description: "Set licenseStatus=REVOKED and remove ATTORNEY role.",
    usage: "attorney:revoke { userId: string }",
    handler: async (ctx, args) => {
      const userId = requireString(args, "userId");

      const updated = await prisma.$transaction(async (tx: any) => {
        const prof = await tx.attorneyProfile.upsert({
          where: { userId },
          update: {
            licenseStatus: "REVOKED",
            verifiedAt: null,
          },
          create: {
            userId,
            licenseStatus: "REVOKED",
            verifiedAt: null,
          },
          select: { id: true, userId: true, licenseStatus: true, verifiedAt: true },
        });

        const u = await tx.user.findUnique({ where: { id: userId }, select: { roles: true } });
        const roles = (u?.roles ?? ["USER"]).filter((r: string) => r !== "ATTORNEY");

        await tx.user.update({
          where: { id: userId },
          data: { roles },
          select: { id: true },
        });

        await tx.audit_logs.create({
          data: {
            id: crypto.randomUUID(),
            user_id: ctx.actor.id,
            action: "INVITE_ACCEPTED",
            message: `Admin console revoked attorney userId=${userId}`,
            created_at: new Date(),
          },
        });

        return { profile: prof, roles };
      });

      return { ok: true, data: updated };
    },
  },

  {
    id: "logs:recent",
    title: "Recent audit logs",
    description: "Show recent audit_logs rows.",
    usage: "logs:recent { limit?: number }",
    handler: async (_ctx, args) => {
      const limit = Math.min(Math.max(args?.limit ? requireNumber(args, "limit") : 50, 1), 200);
      const rows = await prisma.audit_logs.findMany({
        take: limit,
        orderBy: { created_at: "desc" },
      });
      return { ok: true, data: rows };
    },
  },

  {
    id: "registry:permissions",
    title: "Registry permissions",
    description: "List registry permissions for a Clerk userId (Supabase).",
    usage: "registry:permissions { clerkId: string, limit?: number }",
    handler: async (_ctx, args) => {
      const clerkId = requireString(args, "clerkId");
      const limit = Math.min(Math.max(args?.limit ? requireNumber(args, "limit") : 50, 1), 200);

      const sb = supabaseServer();
      const { data, error } = await sb
        .from("registry_permissions")
        .select("*")
        .eq("user_id", clerkId)
        .limit(limit);

      if (error) return { ok: false, error: "Supabase query failed.", details: { message: error.message } };
      return { ok: true, data: data ?? [] };
    },
  },

  {
    id: "resend:test",
    title: "Resend test (placeholder)",
    description: "Reserved for a test email action (wire to your Resend helper).",
    usage: "resend:test { to: string }",
    handler: async (_ctx, args) => {
      const to = requireString(args, "to");
      // Wire your existing Resend utility here.
      return { ok: true, data: { message: `Not wired yet. Would send test email to: ${to}` } };
    },
  },

  {
    id: "client:invite",
    title: "Send client invitation",
    description: "Create or find a client and send them an invitation email.",
    usage: "client:invite { email: string, firstName: string, lastName: string, phone?: string, dateOfBirth?: string }",
    handler: async (ctx, args) => {
      const email = requireString(args, "email").toLowerCase().trim();
      const firstName = requireString(args, "firstName");
      const lastName = requireString(args, "lastName");
      const phone = args?.phone ? String(args.phone).trim() : null;
      const dateOfBirth = args?.dateOfBirth ? String(args.dateOfBirth) : null;

      // Import dependencies
      const { db, clients, attorneyClientAccess, clientInvites, eq } = await import("@/lib/db");
      const { getCurrentUserWithOrg } = await import("@/lib/authz");
      const { sendClientInviteEmail } = await import("@/lib/email");
      const { generateClientFingerprint, findClientByFingerprint } = await import("@/lib/client-fingerprint");
      const { randomBytes, randomUUID } = await import("crypto");

      // Get or create organization for admin (getCurrentUserWithOrg auto-creates if needed)
      const { orgMember } = await getCurrentUserWithOrg();
      
      if (!orgMember) {
        return { ok: false, error: "Failed to get or create organization for admin. Please ensure you have an organization set up." };
      }

      const organizationId = orgMember.organizationId || (orgMember as any).organizations?.id;
      const organizationName = (orgMember as any).organizations?.name || 'Your Firm';

      if (!organizationId) {
        return { ok: false, error: "Organization ID not found" };
      }

      // Check if client already exists
      const [existingClient] = await db.select()
        .from(clients)
        .where(eq(clients.email, email))
        .limit(1);

      let client = existingClient || null;

      if (!client) {
        const fingerprint = generateClientFingerprint({
          email,
          firstName,
          lastName,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        });

        const existingClientId = await findClientByFingerprint(fingerprint, db);
        if (existingClientId) {
          const [existing] = await db.select()
            .from(clients)
            .where(eq(clients.id, existingClientId))
            .limit(1);
          if (existing) client = existing;
        }

        if (!client) {
          const [newClient] = await db.insert(clients)
            .values({
              email,
              firstName,
              lastName,
              phone: phone || null,
              dateOfBirth: dateOfBirth ? (typeof dateOfBirth === 'string' ? dateOfBirth : new Date(dateOfBirth).toISOString().split('T')[0]) : null,
              orgId: organizationId,
              clientFingerprint: fingerprint,
            })
            .returning();
          client = newClient;
        }
      }

      // Grant attorney access
      try {
        await db.insert(attorneyClientAccess)
          .values({
            attorneyId: ctx.actor.id,
            clientId: client.id,
            organizationId: organizationId,
            isActive: true,
          });
      } catch {
        // Access might already exist, ignore
      }

      // Create invite
      const token = randomBytes(24).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      const [invite] = await db.insert(clientInvites)
        .values({
          clientId: client.id,
          email,
          token,
          expiresAt,
          invitedByUserId: ctx.actor.id,
        })
        .returning();

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const inviteUrl = `${baseUrl}/invite/${invite.token}`;

      // Send invite email
      try {
        await sendClientInviteEmail({
          to: email,
          clientName: `${client.firstName} ${client.lastName}`,
          firmName: organizationName,
          inviteUrl,
        });
      } catch (emailError: any) {
        console.error('Failed to send invite email:', emailError);
      }

      // Audit
      const { prisma: prismaClient } = await import("@/lib/prisma");
      await prismaClient.audit_logs.create({
        data: {
          id: randomUUID(),
          user_id: ctx.actor.id,
          action: "INVITE_CREATED",
          message: `Admin console sent client invitation to ${email}`,
          created_at: new Date(),
        },
      });

      return {
        ok: true,
        data: {
          client: {
            id: client.id,
            email: client.email,
            firstName: client.firstName,
            lastName: client.lastName,
          },
          invite: {
            id: invite.id,
            inviteUrl,
            expiresAt: invite.expiresAt,
            token: invite.token,
          },
        },
      };
    },
  },

  {
    id: "policy:create",
    title: "Create policy",
    description: "Create a policy for a client. Supports both canonical insurers and unresolved carriers.",
    usage: "policy:create { clientId: string, insurerName?: string, insurerId?: string, carrierNameRaw?: string, policyNumber?: string, policyType?: string }",
    handler: async (ctx, args) => {
      const clientId = requireString(args, "clientId");
      const insurerName = args?.insurerName ? String(args.insurerName).trim() : null;
      const insurerId = args?.insurerId ? String(args.insurerId).trim() : null;
      const carrierNameRaw = args?.carrierNameRaw ? String(args.carrierNameRaw).trim() : null;
      const policyNumber = args?.policyNumber ? String(args.policyNumber).trim() : null;
      const policyType = args?.policyType ? String(args.policyType).trim() : null;

      // Import dependencies
      const { db, insurers, policies, clients, eq } = await import("@/lib/db");
      const { audit, AuditAction } = await import("@/lib/audit");

      // Verify client exists
      const [clientExists] = await db.select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);

      if (!clientExists) {
        return { ok: false, error: "Client not found" };
      }

      // Determine insurer_id and carrier_name_raw
      let resolvedInsurerId: string | null = null;
      let resolvedCarrierNameRaw: string | null = null;

      if (insurerId) {
        resolvedInsurerId = insurerId;
      } else if (insurerName) {
        const [existingInsurer] = await db.select()
          .from(insurers)
          .where(eq(insurers.name, insurerName))
          .limit(1);

        if (existingInsurer) {
          resolvedInsurerId = existingInsurer.id;
        } else {
          resolvedCarrierNameRaw = insurerName;
        }
      } else if (carrierNameRaw) {
        resolvedCarrierNameRaw = carrierNameRaw;
      }

      // Validate that at least one form of insurer identification is provided
      if (!resolvedInsurerId && !resolvedCarrierNameRaw) {
        return {
          ok: false,
          error: "Either insurerId, insurerName, or carrierNameRaw is required to identify the insurance carrier",
        };
      }

      // Create policy
      const [policy] = await db.insert(policies)
        .values({
          clientId,
          insurerId: resolvedInsurerId,
          carrierNameRaw: resolvedCarrierNameRaw,
          carrierConfidence: null,
          policyNumber: policyNumber || null,
          policyType: policyType || null,
        })
        .returning();

      const insurerDisplayName = resolvedInsurerId
        ? (await db.select().from(insurers).where(eq(insurers.id, resolvedInsurerId)).limit(1))[0]?.name || 'Unknown'
        : resolvedCarrierNameRaw || 'Unknown';

      await audit(AuditAction.POLICY_CREATED, {
        clientId: policy.clientId,
        policyId: policy.id,
        message: `Admin console created policy for client ${policy.clientId} with insurer ${insurerDisplayName}${resolvedCarrierNameRaw ? ' (unresolved)' : ''}`,
      });

      return {
        ok: true,
        data: {
          policy: {
            id: policy.id,
            clientId: policy.clientId,
            insurerId: policy.insurerId,
            carrierNameRaw: policy.carrierNameRaw,
            policyNumber: policy.policyNumber,
            policyType: policy.policyType,
            createdAt: policy.createdAt,
          },
          insurerDisplayName,
          isUnresolved: !!resolvedCarrierNameRaw,
        },
      };
    },
  },
];

export const COMMAND_MAP: Record<string, CommandDef> = Object.fromEntries(
  COMMANDS.map((c) => [c.id, c])
);

