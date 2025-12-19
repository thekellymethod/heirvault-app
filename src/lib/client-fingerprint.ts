import { createHash } from "crypto";

/**
 * Generate a unique fingerprint for a client based on identifying information.
 * This helps prevent duplicate client records while allowing legitimate duplicates
 * (e.g., two different people with the same name and DOB).
 * 
 * The fingerprint combines:
 * - Email (primary identifier)
 * - Name + DOB (if available)
 * - SSN last 4 (if available)
 * - Passport number (if available)
 * - Driver's license (if available)
 */
export function generateClientFingerprint(clientData: {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | string | null;
  ssnLast4?: string | null;
  passportNumber?: string | null;
  driversLicense?: string | null;
}): string {
  const parts: string[] = [];

  // Email is always included (normalized to lowercase)
  parts.push(`email:${clientData.email.toLowerCase().trim()}`);

  // Name + DOB combination (if DOB is available)
  if (clientData.dateOfBirth) {
    const dob = clientData.dateOfBirth instanceof Date
      ? clientData.dateOfBirth.toISOString().split('T')[0]
      : typeof clientData.dateOfBirth === 'string'
      ? clientData.dateOfBirth.split('T')[0]
      : null;
    
    if (dob) {
      const normalizedName = `${clientData.firstName.trim().toLowerCase()}_${clientData.lastName.trim().toLowerCase()}`;
      parts.push(`name_dob:${normalizedName}_${dob}`);
    }
  }

  // SSN last 4 (if available)
  if (clientData.ssnLast4) {
    parts.push(`ssn:${clientData.ssnLast4.trim()}`);
  }

  // Passport number (if available)
  if (clientData.passportNumber) {
    parts.push(`passport:${clientData.passportNumber.trim().toUpperCase()}`);
  }

  // Driver's license (if available)
  if (clientData.driversLicense) {
    parts.push(`dl:${clientData.driversLicense.trim().toUpperCase()}`);
  }

  // Create hash of all parts
  const combined = parts.sort().join('|');
  return createHash('sha256').update(combined).digest('hex');
}

/**
 * Check if a client with the same fingerprint already exists.
 * Returns the existing client ID if found, null otherwise.
 */
export async function findClientByFingerprint(
  fingerprint: string,
  prisma: any
): Promise<string | null> {
  try {
    // Try raw SQL first
    const result = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM clients WHERE client_fingerprint = ${fingerprint} LIMIT 1
    `;
    
    if (result && result.length > 0) {
      return result[0].id;
    }
  } catch (sqlError: any) {
    console.error("Client fingerprint lookup: Raw SQL failed, trying Prisma:", sqlError.message);
    // Fallback to Prisma
    try {
      const client = await prisma.client.findUnique({
        where: { client_fingerprint: fingerprint },
        select: { id: true },
      });
      return client?.id || null;
    } catch (prismaError: any) {
      console.error("Client fingerprint lookup: Prisma also failed:", prismaError.message);
      return null;
    }
  }
  
  return null;
}

