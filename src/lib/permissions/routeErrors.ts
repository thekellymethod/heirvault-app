import { z } from "zod";
import { HttpError } from "@/lib/permissions/guard";

/**
 * Normalize errors from policy-document routes (and similar) into {@link HttpError}
 * for use inside {@link withRouteGuard}.
 */
export function rethrowAsRouteHttpError(err: unknown): never {
  if (err instanceof z.ZodError) {
    const msg = err.issues.map((i) => i.message).join("; ") || "Invalid input";
    throw new HttpError(400, msg);
  }
  if (err instanceof HttpError) throw err;
  if (err instanceof Error) {
    const m = err.message;
    if (/invalid/i.test(m) || /must not contain|slug|uuid/i.test(m)) {
      throw new HttpError(400, m);
    }
    if (m.includes("Storage upload failed") && /already exists|Duplicate/i.test(m)) {
      throw new HttpError(409, m);
    }
    if (/not found/i.test(m)) {
      throw new HttpError(404, m);
    }
  }
  throw err;
}
