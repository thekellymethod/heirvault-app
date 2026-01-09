import "server-only";
import { z } from "zod";

/**
 * Server-only environment variable validation
 * Uses Zod for type-safe validation with clear error messages
 */

// Zod schema for required environment variables
const requiredEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),
  
  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required").startsWith("pk_", "Invalid Clerk publishable key format"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required").startsWith("sk_", "Invalid Clerk secret key format"),
  
  // Application
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  
  // Supabase (required for Supabase-backed features)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  
  // Security
  HEIRVAULT_TOKEN_SECRET: z.string().min(32, "HEIRVAULT_TOKEN_SECRET must be at least 32 characters"),
});

// Zod schema for optional environment variables
const optionalEnvSchema = z.object({
  // Prisma Accelerate (optional)
  PRISMA_ACCELERATE_URL: z.string().url().optional(),
  
  // Supabase Storage
  HEIRVAULT_STORAGE_BUCKET: z.string().optional(),
  SUPABASE_PROJECT_REF: z.string().optional(),
  SUPABASE_ACCESS_TOKEN: z.string().optional(),
  
  // OpenAI (optional - for NL console)
  OPENAI_API_KEY: z.string().optional(),
  
  // Sentry (optional)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  
  // Feature Flags
  ADMIN_CONSOLE_ENABLED: z.string().optional(),
  ADMIN_CONSOLE_NL_ENABLED: z.string().optional(),
  ADMIN_API_TOKEN_AUTH_ENABLED: z.string().optional(),
  ADMIN_CONSOLE_WRITE_CONFIRM: z.string().optional(),
  BILLING_ENABLED: z.string().optional(),
  
  // Email (optional)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  MAIL_FROM: z.string().email().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  
  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Admin Access Control
  ADMIN_EMAILS: z.string().optional(),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_USER_IDS: z.string().optional(),
  
  // AWS S3 (alternative storage)
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
}).passthrough(); // Allow additional env vars

// Type inference from schemas
export type RequiredEnv = z.infer<typeof requiredEnvSchema>;
export type OptionalEnv = z.infer<typeof optionalEnvSchema>;

// Legacy compatibility - keep for existing code
const requiredEnvVars = {
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
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
  BILLING_ENABLED: process.env.BILLING_ENABLED,
  
  // Email (optional)
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  
  // Stripe (optional)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
} as const;

/**
 * Validates critical environment variables using Zod
 * Throws with detailed error messages if validation fails
 */
export function validateEnv(): RequiredEnv {
  try {
    return requiredEnvSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      HEIRVAULT_TOKEN_SECRET: process.env.HEIRVAULT_TOKEN_SECRET,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => 
        `  - ${issue.path.join(".")}: ${issue.message}`
      ).join("\n");
      throw new Error(
        `Environment validation failed:\n${issues}\n\n` +
        `Please check your .env.local file or environment variables.\n` +
        `See .env.example for required variables.`
      );
    }
    throw error;
  }
}

/**
 * Validates optional environment variables
 * Returns validated object or empty object if validation fails (non-fatal)
 */
export function validateOptionalEnv(): Partial<OptionalEnv> {
  try {
    return optionalEnvSchema.parse(process.env);
  } catch (error) {
    // Optional env validation failures are non-fatal
    console.warn("Optional environment variable validation warnings:", error);
    return {};
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

