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
  email: string,
  firstName: string,
  lastName: string,
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
  const existingInvite = await prisma.client_invites.findFirst({
    where: { token: normalizedToken },
    include: {
      clients: true,
    },
  });

  if (existingInvite) {
    return {
      id: existingInvite.id,
      clientId: existingInvite.clientId,
      email: existingInvite.email,
      token: existingInvite.token,
      expiresAt: existingInvite.expiresAt,
      usedAt: existingInvite.usedAt,
      createdAt: existingInvite.createdAt,
      client: {
        id: existingInvite.clients.id,
        firstName: existingInvite.clients.firstName || "",
        lastName: existingInvite.clients.lastName || "",
        email: existingInvite.clients.email,
        phone: existingInvite.clients.phone || null,
        dateOfBirth: existingInvite.clients.dateOfBirth || null,
      },
    };
  }

  // Find or create client
  let client = await prisma.clients.findFirst({
    where: { email: clientInfo.email },
  });

  if (!client) {
    client = await prisma.clients.create({
      data: {
        id: crypto.randomUUID(),
        email: clientInfo.email,
        firstName: clientInfo.firstName,
        lastName: clientInfo.lastName,
      },
    });
  }

  // Create invite with expiration (14 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const newInvite = await prisma.client_invites.create({
    data: {
      id: crypto.randomUUID(),
      clientId: client.id,
      email: clientInfo.email,
      token: normalizedToken,
      expiresAt: expiresAt,
    },
  });

  return {
    id: newInvite.id,
    clientId: newInvite.clientId,
    email: newInvite.email,
    token: newInvite.token,
    expiresAt: newInvite.expiresAt,
    usedAt: newInvite.usedAt,
    createdAt: newInvite.createdAt,
    client: {
      id: client.id,
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      email: client.email,
      phone: client.phone || null,
      dateOfBirth: client.dateOfBirth || null,
    },
  };
}

