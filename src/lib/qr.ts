import { createHmac } from "crypto";

/**
 * QR Token Library
 * 
 * Generates signed tokens for secure access to registry records.
 * Never returns registry IDs directly - always uses signed tokens.
 */

const QR_TOKEN_SECRET = process.env.QR_TOKEN_SECRET || "change-me-in-production";
const QR_TOKEN_EXPIRY_DAYS = 365; // Tokens valid for 1 year

export type QRTokenPayload = {
  registryId: string;
  versionId?: string; // Optional: specific version
  createdAt: number; // Timestamp when token was created
  expiresAt: number; // Timestamp when token expires
};

/**
 * Generate a signed QR token for a registry record
 * 
 * Never returns registry ID directly. Use this function to generate
 * a signed token that can be safely included in QR codes and URLs.
 * 
 * @param registryId - The registry record ID (never exposed directly)
 * @param versionId - Optional: specific version ID
 * @returns Signed token string (safe to expose)
 */
export function generateQRToken(registryId: string, versionId?: string): string {
  const now = Date.now();
  const expiresAt = now + (QR_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const payload: QRTokenPayload = {
    registryId,
    versionId,
    createdAt: now,
    expiresAt,
  };

  // Encode payload as base64
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");

  // Create HMAC signature
  const signature = createHmac("sha256", QR_TOKEN_SECRET)
    .update(payloadBase64)
    .digest("base64url");

  // Return token as: payload.signature
  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode a QR token
 * 
 * Validates the token signature and expiration, then returns the payload.
 * Returns null if token is invalid or expired.
 * 
 * @param token - The signed token string
 * @returns Decoded payload or null if invalid
 */
export function verifyQRToken(token: string): QRTokenPayload | null {
  try {
    const [payloadBase64, signature] = token.split(".");

    if (!payloadBase64 || !signature) {
      return null;
    }

    // Verify signature
    const expectedSignature = createHmac("sha256", QR_TOKEN_SECRET)
      .update(payloadBase64)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return null; // Invalid signature
    }

    // Decode payload
    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const payload: QRTokenPayload = JSON.parse(payloadJson);

    // Check expiration
    if (Date.now() > payload.expiresAt) {
      return null; // Token expired
    }

    return payload;
  } catch (error) {
    console.error("Error verifying QR token:", error);
    return null;
  }
}

/**
 * Generate QR code data URL for a registry
 * 
 * Creates a QR code that links to the update page with the signed token.
 * 
 * Requires: npm install qrcode @types/qrcode
 * 
 * @param registryId - The registry record ID
 * @param baseUrl - Base URL for the application
 * @returns QR code data URL (can be used in img src)
 */
export async function generateQRCodeDataURL(registryId: string, baseUrl: string): Promise<string> {
  const token = generateQRToken(registryId);
  const updateUrl = `${baseUrl}/update/${token}`;

  // Use a QR code library (install: npm install qrcode @types/qrcode)
  try {
    // Dynamic import to avoid build-time error if library not installed
    // @ts-expect-error - Dynamic import, types may not be available at build time
    const QRCode = await import("qrcode");
    return await QRCode.toDataURL(updateUrl, {
      errorCorrectionLevel: "M",
      type: "image/png",
      width: 300,
      margin: 1,
    });
  } catch {
    // Fallback: return data URL for a placeholder SVG
    // In production, ensure qrcode is installed: npm install qrcode @types/qrcode
    console.warn("QRCode library not available, using placeholder. Install with: npm install qrcode @types/qrcode");
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5RUiBDb2RlIFBsYWNlaG9sZGVyPC90ZXh0Pjwvc3ZnPg==";
  }
}

/**
 * Get registry ID from QR token (for internal use only)
 * 
 * This function should only be used in server-side code to extract
 * the registry ID from a verified token. Never expose registry IDs
 * directly to clients.
 * 
 * @param token - The signed token string
 * @returns Registry ID or null if token is invalid
 */
export function getRegistryIdFromToken(token: string): string | null {
  const payload = verifyQRToken(token);
  return payload?.registryId || null;
}
