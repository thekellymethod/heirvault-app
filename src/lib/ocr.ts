import { createWorker, PSM } from "tesseract.js";
import { Buffer } from "buffer";

interface ExtractedPolicyData {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  policyNumber: string | null;
  policyType: string | null;
  insurerName: string | null;
  insurerPhone: string | null;
  insurerEmail: string | null;
  confidence: number; // Overall confidence score (0-1)
}

/**
 * Extracts text from PDF using pdf-parse
 * Uses dynamic import to handle ESM/CJS compatibility issues with Turbopack
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid static analysis issues with Turbopack
    // pdf-parse exports differently in ESM vs CJS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParseModule = await import("pdf-parse" as any);
    
    // Handle different export patterns
    const pdfParseFn = 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pdfParseModule as any).default || 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pdfParseModule as any).pdfParse || 
      pdfParseModule;
    
    if (typeof pdfParseFn !== "function") {
      throw new Error("pdf-parse function not found in module");
    }
    
    const data = await pdfParseFn(buffer);
    return data.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * Extracts text from image using Tesseract OCR
 */
async function extractTextFromImage(buffer: Buffer): Promise<{ text: string; confidence: number }> {
  try {
    const worker = await createWorker("eng");
    // Configure for better accuracy
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
    });
    const { data } = await worker.recognize(buffer);
    await worker.terminate();
    
    return {
      text: data.text,
      confidence: data.confidence / 100, // Convert to 0-1 scale
    };
  } catch (error) {
    console.error("Error extracting text from image:", error);
    throw new Error("Failed to extract text from image");
  }
}

/**
 * Parses extracted text to find policy information
 * Uses multiple regex patterns to find common policy document formats
 */
function parsePolicyText(text: string): ExtractedPolicyData {
  const extracted: ExtractedPolicyData = {
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    dateOfBirth: null,
    policyNumber: null,
    policyType: null,
    insurerName: null,
    insurerPhone: null,
    insurerEmail: null,
    confidence: 0,
  };

  // Normalize text for better matching
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  // Extract Policy Number - common patterns (improved accuracy)
  const policyNumberPatterns = [
    /policy\s*(?:number|#|no\.?|num)\s*:?\s*([A-Z0-9\-]{6,20})/i,
    /policy\s*#\s*:?\s*([A-Z0-9\-]{6,20})/i,
    /(?:policy|pol)\.?\s*(?:no|number|#|num)\s*:?\s*([A-Z0-9\-]{6,20})/i,
    /(?:certificate|cert|contract)\s*(?:number|#|no\.?)\s*:?\s*([A-Z0-9\-]{6,20})/i,
    /^([A-Z]{2,4}[-]?[0-9]{6,15})$/m, // Standalone policy numbers
  ];

  for (const pattern of policyNumberPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      extracted.policyNumber = match[1].trim();
      break;
    }
  }

  // Extract Name - look for common name patterns (improved accuracy)
  const namePatterns = [
    /(?:insured|policyholder|owner|client|beneficiary|name|applicant)\s*:?\s*([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)/i,
    /^([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})$/m,
    /name\s*:?\s*([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})/i,
    /(?:first\s+name|given\s+name)\s*:?\s*([A-Z][a-z]{2,})/i,
    /(?:last\s+name|surname|family\s+name)\s*:?\s*([A-Z][a-z]{2,})/i,
  ];

  for (const pattern of namePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1] && match[2]) {
      const nameParts = match[2].trim().split(/\s+/);
      extracted.firstName = match[1].trim();
      extracted.lastName = nameParts[nameParts.length - 1]; // Last part is usually last name
      break;
    }
  }

  // Extract Email
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const emailMatch = normalizedText.match(emailPattern);
  if (emailMatch) {
    extracted.email = emailMatch[1].trim();
  }

  // Extract Phone - multiple formats
  const phonePatterns = [
    /(?:phone|tel|telephone|mobile)\s*:?\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i,
    /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/,
    /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/,
  ];

  for (const pattern of phonePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      extracted.phone = match[1].trim();
      break;
    }
  }

  // Extract Date of Birth
  const dobPatterns = [
    /(?:date\s+of\s+birth|dob|birth\s+date|born)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
  ];

  for (const pattern of dobPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      // Try to parse and normalize date
      const dateStr = match[1].trim();
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          extracted.dateOfBirth = date.toISOString().split("T")[0];
        }
      } catch {
        extracted.dateOfBirth = dateStr;
      }
      break;
    }
  }

  // Extract Policy Type
  const policyTypePatterns = [
    /(?:policy\s+type|type\s+of\s+policy|coverage\s+type)\s*:?\s*(term|whole\s+life|universal\s+life|variable\s+life|group|other)/i,
    /(term|whole\s+life|universal\s+life|variable\s+life|group)/i,
  ];

  for (const pattern of policyTypePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      extracted.policyType = match[1].trim().toUpperCase();
      break;
    }
  }

  // Extract Insurer Name - usually in header or first few lines
  // Look for common insurance company patterns (improved accuracy)
  const insurerPatterns = [
    /(?:insurance\s+company|insurer|carrier|company|underwriter)\s*:?\s*([A-Z][A-Za-z\s&.,'-]+(?:Insurance|Life|Assurance|Group|Company|Corp|Inc|LLC|Mutual|National)?)/i,
    /^([A-Z][A-Za-z\s&.,'-]{5,}(?:Insurance|Life|Assurance|Group|Company|Corp|Inc|LLC|Mutual|National)?)/m,
    /([A-Z][A-Za-z\s&.,'-]{5,}(?:\s+Life\s+Insurance|\s+Insurance\s+Company|\s+Assurance))/i,
  ];

  // Check first 15 lines for insurer name (increased from 10)
  const headerText = lines.slice(0, 15).join(" ");
  for (const pattern of insurerPatterns) {
    const match = headerText.match(pattern);
    if (match && match[1]) {
      const insurerName = match[1].trim();
      // Filter out common false positives
      if (!insurerName.match(/^(Policy|Certificate|Contract|Date|Name|Address)/i)) {
        extracted.insurerName = insurerName;
        break;
      }
    }
  }

  // Extract Insurer Contact Info
  const insurerPhonePattern = /(?:customer\s+service|contact|phone)\s*:?\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i;
  const insurerPhoneMatch = normalizedText.match(insurerPhonePattern);
  if (insurerPhoneMatch) {
    extracted.insurerPhone = insurerPhoneMatch[1].trim();
  }

  const insurerEmailPattern = /(?:customer\s+service|contact|email)\s*:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  const insurerEmailMatch = normalizedText.match(insurerEmailPattern);
  if (insurerEmailMatch) {
    extracted.insurerEmail = insurerEmailMatch[1].trim();
  }

  // Calculate confidence score based on extracted fields
  let confidenceScore = 0;
  let totalFields = 0;

  if (extracted.policyNumber) {
    confidenceScore += 0.3;
    totalFields++;
  }
  if (extracted.firstName && extracted.lastName) {
    confidenceScore += 0.2;
    totalFields++;
  }
  if (extracted.insurerName) {
    confidenceScore += 0.2;
    totalFields++;
  }
  if (extracted.email) {
    confidenceScore += 0.1;
    totalFields++;
  }
  if (extracted.phone) {
    confidenceScore += 0.1;
    totalFields++;
  }
  if (extracted.dateOfBirth) {
    confidenceScore += 0.05;
    totalFields++;
  }
  if (extracted.policyType) {
    confidenceScore += 0.05;
    totalFields++;
  }

  extracted.confidence = totalFields > 0 ? confidenceScore : 0;

  return extracted;
}

/**
 * Main OCR extraction function
 */
export async function extractPolicyData(
  file: File,
  buffer: Buffer
): Promise<ExtractedPolicyData> {
  let text = "";
  let confidence = 0.5; // Default confidence

  try {
    if (file.type === "application/pdf") {
      // Extract text from PDF
      try {
        text = await extractTextFromPDF(buffer);
        confidence = 0.8; // PDFs with text layers are usually more accurate
      } catch (_pdfError) {
        // If PDF text extraction fails (scanned PDF), try OCR on first page
        console.log("PDF text extraction failed, attempting OCR on first page...");
        // For scanned PDFs, we'd need to convert to image first
        // For now, throw error to indicate manual entry needed
        throw new Error("PDF appears to be scanned. Please enter information manually or upload as an image.");
      }
    } else if (file.type.startsWith("image/")) {
      // Extract text from image using OCR
      const result = await extractTextFromImage(buffer);
      text = result.text;
      confidence = result.confidence;
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    if (!text || text.trim().length === 0) {
      throw new Error("No text could be extracted from the document. Please enter information manually.");
    }

    // Parse the extracted text
    const extracted = parsePolicyText(text);

    // Update confidence based on OCR confidence
    extracted.confidence = (extracted.confidence + confidence) / 2;

    return extracted;
  } catch (error) {
    console.error("Error in OCR extraction:", error);
    throw error;
  }
}

