import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { getOrCreateAppUser } from "@/lib/auth/CurrentUser";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type DescribedError = {
  summary: string;
  type: string;
  name?: string;
  message?: string;
  stack?: string;
  details?: string;
  hint?: string;
  code?: string;
  value?: unknown;
  keys?: string[];
};

/**
 * Helper to describe errors for logging - prevents [object Object] and bare `{}` in Next dev overlay
 */
export function describeError(e: unknown): DescribedError {
  if (e instanceof Error) {
    const summary = [e.name, e.message].filter(Boolean).join(": ") || "Error";
    return {
      summary,
      type: "Error",
      name: e.name,
      message: e.message,
      stack: e.stack,
    };
  }
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const msg = o.message;
    const details = o.details;
    const hint = o.hint;
    const code = o.code;
    if (
      typeof msg === "string" ||
      typeof details === "string" ||
      typeof code === "string"
    ) {
      const summary = [
        typeof code === "string" && code ? code : null,
        typeof msg === "string" ? msg : null,
        typeof details === "string" ? details.split("\n")[0]?.slice(0, 240) : null,
      ]
        .filter(Boolean)
        .join(" — ");
      return {
        summary: summary || "PostgREST/Supabase error (empty message)",
        type: "PostgrestError",
        name: typeof o.name === "string" ? o.name : undefined,
        message: typeof msg === "string" ? msg : undefined,
        details: typeof details === "string" ? details : undefined,
        hint: typeof hint === "string" ? hint : undefined,
        code: typeof code === "string" ? code : undefined,
      };
    }
    try {
      const value = JSON.parse(JSON.stringify(e)) as unknown;
      if (value && typeof value === "object" && Object.keys(value as object).length > 0) {
        const summary = JSON.stringify(value);
        return { summary, type: typeof e, value };
      }
    } catch {
      /* fall through */
    }
    const picked: Record<string, unknown> = {};
    for (const k of Object.getOwnPropertyNames(o)) {
      const v = o[k];
      if (
        typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "boolean" ||
        v == null
      ) {
        picked[k] = v;
      }
    }
    if (Object.keys(picked).length > 0) {
      const summary = JSON.stringify(picked);
      return { summary, type: "object", value: picked };
    }

    const keys = [
      ...new Set([...Object.keys(o), ...Object.getOwnPropertyNames(o)]),
    ];
    const ctor = (o as { constructor?: { name?: string } }).constructor?.name;
    const summary =
      keys.length > 0
        ? `non-serializable object (${ctor ?? "Object"}), keys: ${keys.join(", ")}`
        : `empty object (${ctor ?? "Object"})`;
    return {
      summary,
      type: "object",
      keys,
      value: keys.length ? { note: "use keys + getters; JSON.stringify was {}" } : {},
    };
  }
  try {
    const value = JSON.parse(JSON.stringify(e));
    const summary =
      value !== undefined && value !== null && typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
    return { summary, type: typeof e, value };
  } catch {
    const summary = String(e);
    return { summary, type: typeof e, value: summary };
  }
}

export async function requireAuth() {
  const user = await getOrCreateAppUser();
  if (!user) throw new HttpError(401, "Not authenticated.");
  return user;
}

/**
 * Require admin access. Checks Clerk public metadata first (authoritative),
 * then falls back to database roles and ADMIN_EMAILS env var for backward compatibility.
 * 
 * Primary source: Clerk publicMetadata.role === "admin"
 * Fallback: Database roles array includes "ADMIN" OR email in ADMIN_EMAILS
 * 
 * @throws HttpError(401) if user is not authenticated
 * @throws HttpError(403) if user is not an admin
 */
export async function requireAdmin() {
  try {
    // First check Clerk public metadata (authoritative source)
    const clerkUser = await currentUser();
    if (!clerkUser) {
      throw new HttpError(401, "Not authenticated.");
    }

    // Check Clerk public metadata first (primary source of truth)
    // Handle both "role" and "user.role" formats for backward compatibility
    const publicMetadata = (clerkUser.publicMetadata || {}) as Record<string, unknown>;
    const clerkRole = (publicMetadata.role || (publicMetadata as Record<string, unknown>)["user.role"] || null) as string | null;
    const isAdminInClerk = clerkRole === "admin";
    
    if (isAdminInClerk) {
      // User is admin via Clerk metadata - return the database user
      const user = await requireAuth();
      return user;
    }

    // Fallback: Check database roles and ADMIN_EMAILS (backward compatibility)
    const user = await requireAuth();
    
    // Check if user has ADMIN role in database
    if (user.roles.includes("ADMIN")) {
      return user;
    }

    // Check if email is in ADMIN_EMAILS env var (backward compatibility)
    if (user.email) {
      const email = user.email.toLowerCase();
      const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase().trim();
      const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) || [];
      
      const isAdminByEmail = 
        (bootstrapAdminEmail && email === bootstrapAdminEmail) ||
        adminEmails.includes(email);
      
      if (isAdminByEmail) {
        return user;
      }
    }

    // Not an admin via any method
    throw new HttpError(403, "Admin access required.");
  } catch (error) {
    // Re-throw HttpError as-is (it's already properly formatted)
    if (error instanceof HttpError) {
      console.error("[requireAdmin] HttpError thrown:", describeError(error));
      throw error;
    }
    
    // For other errors (database errors, etc.), log with full details
    const errorInfo = describeError(error);
    console.warn(
      "[requireAdmin] Unexpected error:",
      errorInfo.summary,
      errorInfo
    );
    
    // Extract error message - handle both Error instances and error objects
    let errorMessage: string;
    let errorCode: string | undefined;
    let errorDetails: string | undefined;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorCode = (error as any)?.code;
    } else if (error && typeof error === "object") {
      // Handle error objects (like Supabase errors)
      const err = error as Record<string, unknown>;
      errorMessage = (err.message as string) || (err.details as string) || String(error);
      errorCode = err.code as string | undefined;
      errorDetails = err.details as string | undefined;
      
      // If we have details, prefer that over message
      if (errorDetails && typeof errorDetails === "string") {
        errorMessage = errorDetails;
      }
    } else {
      errorMessage = String(error);
    }
    
    // Check for network/DNS errors
    if (
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("getaddrinfo") ||
      errorMessage.includes("fetch failed") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorCode === "ENOTFOUND"
    ) {
      console.error("[requireAdmin] Network/DNS error detected - cannot reach Supabase");
      throw new HttpError(
        503,
        `Service unavailable: Cannot connect to database. Please check your network connection and ensure NEXT_PUBLIC_SUPABASE_URL is correctly configured. Error: ${errorMessage}`
      );
    }
    
    // Check if it's a PostgREST/database schema error
    if (errorCode === "PGRST204" || errorMessage.includes("Could not find") || errorMessage.includes("column") || errorMessage.includes("schema cache")) {
      const clerkHint = errorMessage.includes("clerk_id")
        ? " The users table uses the quoted column \"clerkId\" (not clerk_id). Ensure DB helpers send clerkId."
        : "";
      console.warn("[requireAdmin] PostgREST schema/column error:", errorMessage, clerkHint);
      throw new HttpError(
        500,
        `Database schema error: ${errorMessage}.${clerkHint}`
      );
    }
    
    // If it's a database/user creation error, return 500 with helpful message
    if (errorMessage.includes("database") || errorMessage.includes("create") || errorMessage.includes("insert") || errorMessage.includes("DB") || errorMessage.includes("PostgREST")) {
      throw new HttpError(500, `Database error during authentication: ${errorMessage}`);
    }
    
    // For other unexpected errors, return 500 with the actual error message
    throw new HttpError(500, `Authentication error: ${errorMessage}`);
  }
}

export async function requireVerifiedAttorney() {
  const user = await requireAuth();

  // Admin bypass (admin can access attorney pages even without AttorneyProfile)
  if (user.roles.includes("ADMIN")) {
    return user;
  }

  // Non-admin must have ATTORNEY role
  if (!user.roles.includes("ATTORNEY")) {
    // Provide helpful error message with link to apply
    const error = new HttpError(403, "Attorney access required. Please apply to become an attorney.") as HttpError & { redirectTo?: string };
    error.redirectTo = "/attorney/apply";
    throw error;
  }

  // Check attorney profile verification
  type AttorneyProfileRecord = {
    licenseStatus?: string;
    license_status?: string;
    verifiedAt?: string | Date | null;
    verified_at?: string | Date | null;
    userId?: string;
    user_id?: string;
  };

  const { findMany } = await import("@/lib/db");
  const attorneyResults = await findMany<AttorneyProfileRecord>("attorney_profiles", {
    where: { userId: user.id },
    limit: 1,
  });
  
  const attorneyRow = attorneyResults && attorneyResults.length > 0 ? attorneyResults[0] : null;
  const attorney = attorneyRow ? {
    licenseStatus: attorneyRow.licenseStatus || attorneyRow.license_status || '',
    verifiedAt: attorneyRow.verifiedAt || attorneyRow.verified_at || null,
  } : null;

  if (!attorney?.verifiedAt || attorney.licenseStatus !== "ACTIVE") {
    // Check if they have a pending application
    if (attorney && attorney.licenseStatus === "PENDING") {
      const error = new HttpError(403, "Your attorney application is pending verification. An administrator will review it shortly.") as HttpError & { redirectTo?: string };
      error.redirectTo = "/attorney/apply?pending=true";
      throw error;
    }
    // No application yet
    const error = new HttpError(403, "Attorney verification required. Please submit an application.") as HttpError & { redirectTo?: string };
    error.redirectTo = "/attorney/apply";
    throw error;
  }

  return user;
}

export async function requireVerifiedAttorneyWithClerkId() {
  const user = await requireVerifiedAttorney();
  // user.clerkId exists from AppUser
  return user; // { id, clerkId, email, roles }
}