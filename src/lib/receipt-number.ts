// src/lib/receipt-number.ts
// Generate human-safe receipt numbers (non-sequential)

/**
 * Generate a human-readable, non-sequential receipt number
 * Format: RCP-XXXX-XXXX where X is alphanumeric (excluding confusing chars)
 */
export function generateReceiptNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excludes I, O, 0, 1
  const segments = [4, 4]; // Two segments of 4 characters each
  
  const segmentsStr = segments.map(length => {
    let segment = "";
    for (let i = 0; i < length; i++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    return segment;
  }).join("-");
  
  return `RCP-${segmentsStr}`;
}

