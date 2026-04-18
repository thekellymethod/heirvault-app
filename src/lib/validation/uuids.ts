import { z } from "zod";

export const uuidSchema = z.string().uuid();

/** Parse and lowercase a UUID string (throws ZodError if invalid). */
export function normalizeUuid(id: string): string {
  return uuidSchema.parse(id.trim()).toLowerCase();
}
