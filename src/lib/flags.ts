import "server-only";

/**
 * Feature flags - server-only
 * These control which features are enabled in different environments
 */

export const BILLING_ENABLED = process.env.BILLING_ENABLED === "true";

