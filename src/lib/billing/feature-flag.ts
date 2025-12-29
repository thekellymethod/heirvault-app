import "server-only";

/**
 * Checks if billing features are enabled
 * Returns true if BILLING_ENABLED is explicitly set to "true"
 * Defaults to false for safety (billing disabled unless explicitly enabled)
 */
export function isBillingEnabled(): boolean {
  return process.env.BILLING_ENABLED === "true";
}

/**
 * Throws an error if billing is not enabled
 * Use this to guard billing routes and features
 */
export function requireBillingEnabled(): void {
  if (!isBillingEnabled()) {
    throw new Error("Billing features are not enabled");
  }
}

