import { logAccess as dbLogAccess } from "@/lib/db";

/**
 * Audit Logger
 * 
 * Centralized audit logging function.
 * Every route handler must call this.
 * This is where credibility lives.
 */

/**
 * Action union type for audit logs
 */
export type Action =
  | "INTAKE_SUBMITTED"
  | "REGISTRY_UPDATED_BY_TOKEN"
  | "DASHBOARD_VIEW"
  | "REGISTRY_VIEW"
  | "SEARCH_PERFORMED"
  | "ACCESS_REQUESTED"
  | "ACCESS_GRANTED"
  | "DOCUMENT_UPLOADED";

/**
 * Mask sensitive values in metadata
 * 
 * Never log raw SSNs or full policy numbers.
 * Masks SSNs (XXX-XX-1234) and policy numbers (last 4 digits only).
 */
function maskSensitiveData(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  // Mask SSN: XXX-XX-1234
  const ssnPattern = /\b\d{3}-?\d{2}-?\d{4}\b/g;
  if (ssnPattern.test(value)) {
    return value.replace(ssnPattern, (match) => {
      const digits = match.replace(/-/g, "");
      return `XXX-XX-${digits.slice(-4)}`;
    });
  }

  // Mask policy numbers (if longer than 4 digits, show only last 4)
  // Policy numbers are typically 8-12 digits
  const policyPattern = /\b\d{8,12}\b/g;
  if (policyPattern.test(value)) {
    return value.replace(policyPattern, (match) => {
      return `****${match.slice(-4)}`;
    });
  }

  return value;
}

/**
 * Recursively mask sensitive data in objects
 */
function maskMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) {
      masked[key] = value;
    } else if (typeof value === "object" && !Array.isArray(value) && value.constructor === Object) {
      // Recursively mask nested objects
      masked[key] = maskMetadata(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      // Mask array elements
      masked[key] = value.map((item) => maskSensitiveData(item));
    } else {
      // Mask primitive values
      masked[key] = maskSensitiveData(value);
    }
  }
  
  return masked;
}

/**
 * Log access to a registry
 * 
 * Every route handler must call this function.
 * Creates an immutable audit trail entry.
 * 
 * Metadata is automatically sanitized to mask sensitive values:
 * - SSNs: XXX-XX-1234
 * - Policy numbers: ****1234 (last 4 digits only)
 * 
 * @param input - Log access input
 * @param input.userId - User ID (null for system actions)
 * @param input.registryId - Registry ID (optional for system-wide actions like search)
 * @param input.action - Action type
 * @param input.metadata - Optional metadata (JSON-serializable, sensitive values masked)
 */
export async function logAccess({
  userId,
  registryId,
  action,
  metadata,
}: {
  userId: string | null;
  registryId?: string;
  action: Action;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  // Mask sensitive data in metadata
  const sanitizedMetadata = metadata ? maskMetadata(metadata) : undefined;

  // Ensure metadata is JSON-serializable
  // This will throw if metadata contains non-serializable values
  if (sanitizedMetadata) {
    try {
      JSON.stringify(sanitizedMetadata);
    } catch (error) {
      console.error("logAccess: Metadata is not JSON-serializable", error);
      // Replace with error message instead of failing silently
      sanitizedMetadata.error = "Metadata serialization failed";
    }
  }

  // Call db.logAccess() with required registryId
  // For system-wide actions (like search), use a special registryId
  const finalRegistryId = registryId || "system";

  await dbLogAccess({
    registryId: finalRegistryId,
    userId: userId ?? null,
    action,
    metadata: sanitizedMetadata,
  });
}
