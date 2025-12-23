import "server-only";

/**
 * Server-only environment variable validation
 * Throws on missing critical variables to prevent deployment with misconfiguration
 */

const requiredEnvVars = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  
  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  
  // Optional but recommended
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
} as const;

const optionalEnvVars = {
  // Prisma Accelerate (optional)
  PRISMA_ACCELERATE_URL: process.env.PRISMA_ACCELERATE_URL,
  
  // Supabase Storage (optional)
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  HEIRVAULT_STORAGE_BUCKET: process.env.HEIRVAULT_STORAGE_BUCKET,
  
  // OpenAI (optional - for NL console)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // Token Security
  HEIRVAULT_TOKEN_SECRET: process.env.HEIRVAULT_TOKEN_SECRET,
  
  // Sentry (optional)
  SENTRY_DSN: process.env.SENTRY_DSN,
  
  // Feature Flags
  ADMIN_CONSOLE_ENABLED: process.env.ADMIN_CONSOLE_ENABLED,
  ADMIN_CONSOLE_NL_ENABLED: process.env.ADMIN_CONSOLE_NL_ENABLED,
  ADMIN_API_TOKEN_AUTH_ENABLED: process.env.ADMIN_API_TOKEN_AUTH_ENABLED,
  ADMIN_CONSOLE_WRITE_CONFIRM: process.env.ADMIN_CONSOLE_WRITE_CONFIRM,
  
  // Email (optional)
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  
  // Stripe (optional)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
} as const;

/**
 * Validates critical environment variables
 * Throws if any required variables are missing
 */
export function validateEnv(): void {
  const missing: string[] = [];
  
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value || value.trim() === "") {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
      `Please set these variables in your environment or .env.local file.`
    );
  }
}

/**
 * Gets a required environment variable
 * Throws if the variable is missing
 */
export function getRequiredEnv(key: keyof typeof requiredEnvVars): string {
  const value = requiredEnvVars[key];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Gets an optional environment variable
 * Returns undefined if not set
 */
export function getOptionalEnv(key: keyof typeof optionalEnvVars): string | undefined {
  return optionalEnvVars[key];
}

/**
 * Validates environment on module load (server-only)
 * This ensures the app fails fast if critical vars are missing
 */
if (typeof window === "undefined") {
  // Only validate in production or when explicitly requested
  if (process.env.NODE_ENV === "production" || process.env.VALIDATE_ENV === "true") {
    try {
      validateEnv();
    } catch (error) {
      console.error("Environment validation failed:", error);
      // In production, throw to prevent deployment
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
    }
  }
}

