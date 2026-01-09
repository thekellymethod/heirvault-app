// Admin Console Commands
// This file defines the available commands for the admin console

import { requireAdmin } from "@/lib/auth/guards";
import { findUnique, update } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

export type Actor = {
  id: string;
  clerkId?: string;
  email: string | null;
  roles: string[];
};

export type CommandHandler = (context: { actor: Actor }, args: Record<string, unknown>) => Promise<{
  ok: boolean;
  data?: unknown;
  error?: string;
}>;

export type CommandDefinition = {
  id: string;
  title: string;
  description: string;
  usage: string;
  handler: CommandHandler;
};

// Command: attorney:verify
// Verify an attorney's license status
const attorneyVerifyHandler: CommandHandler = async ({ actor }, args) => {
  try {
    const userId = args.userId as string;
    const licenseStatus = (args.licenseStatus as string) || "ACTIVE";

    if (!userId) {
      return { ok: false, error: "userId is required" };
    }

    if (!["ACTIVE", "SUSPENDED", "REVOKED"].includes(licenseStatus)) {
      return { ok: false, error: "Invalid license status" };
    }

    type UserRecord = {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      roles: string[];
      clerkId: string;
    };

    const user = await findUnique<UserRecord>("users", { id: userId });

    if (!user) {
      return { ok: false, error: "User not found" };
    }

    type AttorneyProfileRecord = {
      id: string;
      licenseStatus: string;
      verifiedAt: string | null;
    };

    const updatedProfile = await update<AttorneyProfileRecord>("attorney_profiles", { userId }, {
      licenseStatus: licenseStatus as "ACTIVE" | "SUSPENDED" | "REVOKED",
      verifiedAt: licenseStatus === "ACTIVE" ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>);

    // Ensure user has ATTORNEY role
    if (!user.roles.includes("ATTORNEY")) {
      await update("users", { id: userId }, {
        roles: [...user.roles, "ATTORNEY"],
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
    }

    await logAuditEvent({
      userId: actor.id,
      action: "ATTORNEY_VERIFIED",
      metadata: {
        email: user.email,
        licenseStatus,
      },
    });

    return {
      ok: true,
      data: {
        profile: {
          id: (updatedProfile as AttorneyProfileRecord).id,
          licenseStatus: (updatedProfile as AttorneyProfileRecord).licenseStatus,
          verifiedAt: (updatedProfile as AttorneyProfileRecord).verifiedAt,
        },
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Command: attorney:revoke
// Revoke an attorney's license
const attorneyRevokeHandler: CommandHandler = async ({ actor }, args) => {
  try {
    const userId = args.userId as string;

    if (!userId) {
      return { ok: false, error: "userId is required" };
    }

    type UserRecord = {
      id: string;
      email: string;
    };

    const user = await findUnique<UserRecord>("users", { id: userId });

    if (!user) {
      return { ok: false, error: "User not found" };
    }

    type AttorneyProfileRecord = {
      id: string;
      licenseStatus: string;
    };

    const updatedProfile = await update<AttorneyProfileRecord>("attorney_profiles", { userId }, {
      licenseStatus: "REVOKED",
      verifiedAt: null,
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>);

    await logAuditEvent({
      userId: actor.id,
      action: "ATTORNEY_VERIFIED",
      metadata: {
        email: user.email,
        licenseStatus: "REVOKED",
      },
    });

    return {
      ok: true,
      data: {
        profile: {
          id: (updatedProfile as AttorneyProfileRecord).id,
          licenseStatus: (updatedProfile as AttorneyProfileRecord).licenseStatus,
        },
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Command: user:list
// List users (placeholder - can be expanded)
const userListHandler: CommandHandler = async ({ actor }, _args) => {
  try {
    // Placeholder implementation
    return {
      ok: true,
      data: {
        message: "User list command - implementation pending",
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Define all commands
export const COMMANDS: CommandDefinition[] = [
  {
    id: "attorney:verify",
    title: "Verify Attorney",
    description: "Verify an attorney's license status (ACTIVE, SUSPENDED, or REVOKED)",
    usage: "attorney:verify { userId: string, licenseStatus?: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' }",
    handler: attorneyVerifyHandler,
  },
  {
    id: "attorney:revoke",
    title: "Revoke Attorney License",
    description: "Revoke an attorney's license",
    usage: "attorney:revoke { userId: string }",
    handler: attorneyRevokeHandler,
  },
  {
    id: "user:list",
    title: "List Users",
    description: "List all users in the system",
    usage: "user:list",
    handler: userListHandler,
  },
];

// Create COMMAND_MAP from COMMANDS array
export const COMMAND_MAP: Record<string, CommandDefinition> = COMMANDS.reduce(
  (acc, cmd) => {
    acc[cmd.id] = cmd;
    return acc;
  },
  {} as Record<string, CommandDefinition>
);

// Re-export client command types for backward compatibility
export type ClientCommand =
  | { type: "fingerprint"; payload?: Record<string, unknown> }
  | { type: "audit"; payload: { event: string; meta?: Record<string, unknown> } };

export type ClientCommandResponse<T = unknown> = {
  ok: boolean;
  requestId?: string;
  type?: string;
  error?: string;
} & T;

type CommandOptions = {
  timezone?: string; // optional helper for the fingerprint endpoint
};

export async function command<T = unknown>(
  cmd: ClientCommand,
  opts: CommandOptions = {}
): Promise<ClientCommandResponse<T>> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  // Optional: helps stabilize fingerprint across proxies/NATs for debugging
  if (opts.timezone) headers["x-client-timezone"] = opts.timezone;

  const res = await fetch("/api/client", {
    method: "POST",
    headers,
    body: JSON.stringify(cmd),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as ClientCommandResponse<T> | null;

  if (!data) {
    return { ok: false, error: "Failed to parse response JSON" } as ClientCommandResponse<T>;
  }

  if (!res.ok) {
    return { ok: false, error: data.error } as ClientCommandResponse<T>;
  }

  return data as ClientCommandResponse<T>;
}
