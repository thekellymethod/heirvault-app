import { createWorker, PSM } from "tesseract.js";
import { Buffer } from "buffer";

interface DecodedFormData {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  policyNumber: string | null;
  insurerName: string | null;
  policyType: string | null;
  confidence: number;
}

/**
 * Extracts raw text from document for form decoding
 */
async function extractRawText(file: File, buffer: Buffer): Promise<string> {
  if (file.type === "application/pdf") {
    try {
      // Dynamic import to avoid static analysis issues with Turbopack
      // pdf-parse exports differently in ESM vs CJS
      const pdfParseModule = await import("pdf-parse");
      
      // Handle different export patterns
      const pdfParseFn = 
        (pdfParseModule as { default?: unknown }).default || 
        (pdfParseModule as { pdfParse?: unknown }).pdfParse || 
        pdfParseModule;
      
      if (typeof pdfParseFn !== "function") {
        throw new Error("pdf-parse function not found in module");
      }
      
      const data = await (pdfParseFn as (buffer: Buffer) => Promise<{ text: string }>)(buffer);
      return data.text;
    } catch {
      throw new Error("Failed to extract text from PDF");
    }
  } else if (file.type.startsWith("image/")) {
    try {
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
      });
      const { data } = await worker.recognize(buffer);
      await worker.terminate();
      return data.text;
    } catch {
      throw new Error("Failed to extract text from image");
    }
  }
  throw new Error(`Unsupported file type: ${file.type}`);
}

/**
 * Decodes passport-style form with box fields from OCR text
 * Looks for structured box patterns in the scanned document
 */
export async function decodePassportForm(
  file: File,
  buffer: Buffer
): Promise<DecodedFormData> {
  // Extract raw text from document
  const text = await extractRawText(file, buffer);
  
  const decoded: DecodedFormData = {
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    dateOfBirth: null,
    policyNumber: null,
    insurerName: null,
    policyType: null,
    confidence: 0,
  };

  // Normalize text - preserve structure for box detection
  // Note: lines and boxPatterns are kept for potential future use
  // const lines = text.split(/\r?\n/).map((line) => line.trim());

  // Extract First Name (look for "First Name" label followed by boxes)
  const firstNameMatch = extractFieldFromForm(text, "First Name", 20);
  if (firstNameMatch) {
    decoded.firstName = firstNameMatch.trim();
  }

  // Extract Last Name
  const lastNameMatch = extractFieldFromForm(text, "Last Name", 25);
  if (lastNameMatch) {
    decoded.lastName = lastNameMatch.trim();
  }

  // Extract Email
  const emailMatch = extractFieldFromForm(text, "Email", 50);
  if (emailMatch) {
    // Validate email format
    const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (emailPattern.test(emailMatch)) {
      decoded.email = emailMatch.trim().toLowerCase();
    }
  }

  // Extract Phone (10 digits)
  const phoneMatch = extractFieldFromForm(text, "Phone", 10);
  if (phoneMatch) {
    const digits = phoneMatch.replace(/\D/g, "");
    if (digits.length === 10) {
      decoded.phone = digits;
    }
  }

  // Extract Date of Birth (MMDDYYYY format)
  const dobMatch = extractFieldFromForm(text, "Date of Birth", 8);
  if (dobMatch) {
    const digits = dobMatch.replace(/\D/g, "");
    if (digits.length === 8) {
      // Format as YYYY-MM-DD
      const month = digits.substring(0, 2);
      const day = digits.substring(2, 4);
      const year = digits.substring(4, 8);
      if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
        decoded.dateOfBirth = `${year}-${month}-${day}`;
      }
    }
  }

  // Extract Policy Number
  const policyNumberMatch = extractFieldFromForm(text, "Policy Number", 25);
  if (policyNumberMatch) {
    decoded.policyNumber = policyNumberMatch.trim();
  }

  // Extract Insurer Name
  const insurerMatch = extractFieldFromForm(text, "Insurer Name", 40);
  if (insurerMatch) {
    decoded.insurerName = insurerMatch.trim();
  }

  // Extract Policy Type
  const policyTypeMatch = extractFieldFromForm(text, "Policy Type", 10);
  if (policyTypeMatch) {
    const type = policyTypeMatch.trim().toUpperCase();
    if (["TERM", "WHOLE", "UNIVERSAL", "GROUP", "OTHER"].includes(type)) {
      decoded.policyType = type;
    }
  }

  // Calculate confidence based on extracted fields
  let confidenceScore = 0;
  let totalFields = 0;

  if (decoded.firstName) {
    confidenceScore += 0.15;
    totalFields++;
  }
  if (decoded.lastName) {
    confidenceScore += 0.15;
    totalFields++;
  }
  if (decoded.email) {
    confidenceScore += 0.2;
    totalFields++;
  }
  if (decoded.phone) {
    confidenceScore += 0.15;
    totalFields++;
  }
  if (decoded.dateOfBirth) {
    confidenceScore += 0.1;
    totalFields++;
  }
  if (decoded.policyNumber) {
    confidenceScore += 0.15;
    totalFields++;
  }
  if (decoded.insurerName) {
    confidenceScore += 0.05;
    totalFields++;
  }
  if (decoded.policyType) {
    confidenceScore += 0.05;
    totalFields++;
  }

  decoded.confidence = totalFields > 0 ? confidenceScore : 0;

  return decoded;
}

/**
 * Extracts a field value from form text by looking for the label and following boxes
 * Improved pattern matching for passport-style forms
 */
function extractFieldFromForm(text: string, label: string, maxLength: number): string | null {
  // Look for label (case insensitive, with optional colon)
  const labelPatterns = [
    new RegExp(`${label}\\s*:?`, "i"),
    new RegExp(`${label.replace(/\s+/g, "\\s+")}\\s*:?`, "i"), // Handle spaces in label
  ];
  
  let labelIndex = -1;
  for (const pattern of labelPatterns) {
    const match = text.match(pattern);
    if (match) {
      labelIndex = text.indexOf(match[0]);
      break;
    }
  }
  
  if (labelIndex === -1) return null;

  const afterLabel = text.substring(labelIndex);
  // Get the next 5 lines after the label
  const lines = afterLabel.split(/\r?\n/).slice(1, 6);
  const combined = lines.join(" ");

  // Try different box patterns - improved for OCR accuracy
  const patterns = [
    {
      regex: /\[([A-Z0-9\s])\]/g,
      extract: (m: RegExpMatchArray) => m[1],
    },
    {
      regex: /([A-Z0-9])\s{2,}([A-Z0-9])/g,
      extract: (m: RegExpMatchArray) => m[1] + m[2],
    },
    {
      regex: /([A-Z0-9])\|([A-Z0-9])/g,
      extract: (m: RegExpMatchArray) => m[1] + m[2],
    },
    {
      regex: /([A-Z0-9])\s([A-Z0-9])/g,
      extract: (m: RegExpMatchArray) => m[1] + m[2],
    },
    {
      // Single characters separated by any whitespace
      regex: /\b([A-Z0-9])\b/g,
      extract: (m: RegExpMatchArray) => m[1],
    },
  ];

  for (const pattern of patterns) {
    const matches = Array.from(combined.matchAll(pattern.regex));
    if (matches.length >= 3) { // Need at least 3 characters to be confident
      const chars: string[] = [];
      for (const match of matches.slice(0, maxLength)) {
        const char = pattern.extract(match);
        if (char && char.trim() !== "" && /[A-Z0-9]/.test(char)) {
          chars.push(char.toUpperCase());
        }
      }
      if (chars.length > 0) {
        return chars.join("");
      }
    }
  }

  // Fallback: look for continuous text after label (for typed forms)
  const fallbackMatch = afterLabel.match(/:\s*([A-Z0-9\s]{2,50})/i);
  if (fallbackMatch) {
    const cleaned = fallbackMatch[1].trim().replace(/\s+/g, " ").substring(0, maxLength);
    if (cleaned.length > 0) {
      return cleaned;
    }
  }

  return null;
}

