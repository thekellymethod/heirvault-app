import { redirect } from "next/navigation";

/**
 * Error types for defensive error handling
 */
export type ErrorType =
  | "expired_authorization"
  | "insufficient_role"
  | "invalid_token"
  | "invalid_qr"
  | "revoked_credentials"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "access_denied";

/**
 * Redirect to error page with appropriate error type
 * 
 * This function prevents information leakage by:
 * - Not exposing underlying data structures
 * - Using generic error types
 * - Providing clear, user-friendly messages
 */
export function redirectToError(
  type: ErrorType,
  reason?: string
): never {
  const params = new URLSearchParams({ type });
  if (reason) {
    params.set("reason", reason);
  }
  redirect(`/error?${params.toString()}`);
}

/**
 * Check if an error is an authorization/access error
 */
export function isAccessError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("unauthorized") ||
      message.includes("forbidden") ||
      message.includes("access denied") ||
      message.includes("insufficient") ||
      message.includes("expired") ||
      message.includes("revoked") ||
      message.includes("invalid token")
    );
  }
  return false;
}

/**
 * Get error type from error message (defensive - doesn't expose details)
 */
export function getErrorType(error: unknown): ErrorType {
  if (!(error instanceof Error)) {
    return "access_denied";
  }

  const message = error.message.toLowerCase();

  if (message.includes("expired")) {
    return "expired_authorization";
  }
  if (message.includes("insufficient") || message.includes("role")) {
    return "insufficient_role";
  }
  if (message.includes("invalid token") || message.includes("invalid qr")) {
    return "invalid_token";
  }
  if (message.includes("revoked")) {
    return "revoked_credentials";
  }
  if (message.includes("unauthorized")) {
    return "unauthorized";
  }
  if (message.includes("forbidden")) {
    return "forbidden";
  }
  if (message.includes("not found")) {
    return "not_found";
  }

  return "access_denied";
}

/**
 * Handle access errors defensively
 * Redirects to error page without exposing sensitive information
 */
export function handleAccessError(error: unknown): never {
  const errorType = getErrorType(error);
  redirectToError(errorType);
}

