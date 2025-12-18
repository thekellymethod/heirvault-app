import { prisma } from "@/lib/db";

/**
 * Test code prefix - any code starting with this will be auto-created
 */
const TEST_CODE_PREFIX = "TEST-";

/**
 * Checks if a token is a test code based on prefix
 */
export function isTestCode(token: string): boolean {
  return token.toUpperCase().startsWith(TEST_CODE_PREFIX);
}

/**
 * Extracts test client info from token
 * Format: TEST-{NUMBER} or TEST-{NAME}
 * Examples: TEST-001, TEST-JOHN-DOE, TEST-CODE-001
 */
function extractTestClientInfo(token: string): {
  email: string;
  firstName: string;
  lastName: string;
} {
  // Remove TEST- prefix
  const suffix = token.substring(TEST_CODE_PREFIX.length).trim();
  
  // Try to extract a number (e.g., TEST-001 -> 001)
  const numberMatch = suffix.match(/^(\d+)$/);
  if (numberMatch) {
    const num = parseInt(numberMatch[1], 10);
    return {
      email: `test${num}@example.com`,
      firstName: `Test${num}`,
      lastName: "Client",
    };
  }
  
  // Try to extract name parts (e.g., TEST-JOHN-DOE -> John Doe)
  const nameParts = suffix.split("-").filter(Boolean);
  if (nameParts.length >= 2) {
    const firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
    const lastName = nameParts.slice(1).map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join(" ");
    return {
      email: `${nameParts[0].toLowerCase()}.${nameParts.slice(1).join(".").toLowerCase()}@example.com`,
      firstName,
      lastName,
    };
  }
  
  // Default fallback
  const cleanSuffix = suffix.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return {
    email: `test.${cleanSuffix}@example.com`,
    firstName: "Test",
    lastName: cleanSuffix || "Client",
  };
}

/**
 * Gets or creates a test invite automatically
 * This allows test codes to work without pre-population
 */
export async function getOrCreateTestInvite(token: string) {
  // Check if it's a test code
  if (!isTestCode(token)) {
    return null; // Not a test code, return null to use normal lookup
  }

  // Normalize token to uppercase for consistency
  const normalizedToken = token.toUpperCase();

  // Extract client info from token
  const clientInfo = extractTestClientInfo(normalizedToken);

  // Try to find existing invite (use normalized token)
  // Use the same model names as the rest of the codebase
  let invite = await prisma.clientInvite.findUnique({
    where: { token: normalizedToken },
    include: { client: true },
  });

  if (invite) {
    return invite; // Already exists, return it
  }

  // Find or create client
  let client = await prisma.client.findFirst({
    where: { email: clientInfo.email },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        email: clientInfo.email,
        firstName: clientInfo.firstName,
        lastName: clientInfo.lastName,
      },
    });
  }

  // Create invite with expiration (14 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  invite = await prisma.clientInvite.create({
    data: {
      clientId: client.id,
      email: clientInfo.email,
      token: normalizedToken,
      expiresAt,
    },
    include: { client: true },
  });

  return invite;
}

