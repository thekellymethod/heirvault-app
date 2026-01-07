/**
 * Enhanced OCR and Document Extraction
 * Improved accuracy, better parsing, and confidence scoring
 */

import { createWorker, PSM, OEM } from "tesseract.js";
import { Buffer } from "buffer";

export interface ExtractionResult {
  text: string;
  confidence: number;
  wordConfidences: Array<{ word: string; confidence: number }>;
  pageCount?: number;
}

export interface EnhancedExtractedData {
  // Policy Information
  policyNumber: string | null;
  policyType: string | null;
  faceAmount: string | null;
  premiumAmount: string | null;
  
  // Client Information
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  ssnLast4: string | null;
  
  // Insurer Information
  insurerName: string | null;
  insurerPhone: string | null;
  insurerEmail: string | null;
  insurerAddress: string | null;
  
  // Beneficiary Information
  beneficiaries: Array<{
    firstName: string;
    lastName: string;
    relationship: string | null;
    percentage: string | null;
  }>;
  
  // Metadata
  extractionConfidence: number;
  fieldConfidences: Record<string, number>;
  extractionMethod: "pdf-text" | "ocr" | "textract" | "hybrid";
  warnings: string[];
}

/**
 * Enhanced OCR extraction with better accuracy
 */
export async function extractTextWithOCR(
  buffer: Buffer,
  options: {
    language?: string;
    psm?: PSM;
    oem?: OEM;
    preprocess?: boolean;
  } = {}
): Promise<ExtractionResult> {
  const {
    language = "eng",
    psm = PSM.AUTO,
    oem = OEM.LSTM_ONLY,
    preprocess = true,
  } = options;

  try {
    const worker = await createWorker(language, oem);
    
    // Enhanced configuration for better accuracy
    await worker.setParameters({
      tessedit_pageseg_mode: psm,
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.,()/@:&%$# ",
      preserve_interword_spaces: "1",
      tessedit_create_hocr: "0",
      tessedit_create_tsv: "0",
    });

    // Preprocess image if needed (for better OCR accuracy)
    let processedBuffer = buffer;
    if (preprocess && buffer.length > 0) {
      // Note: Image preprocessing would require sharp or similar library
      // For now, we'll use the buffer as-is
      processedBuffer = buffer;
    }

    const { data } = await worker.recognize(processedBuffer);
    await worker.terminate();

    // Extract word-level confidences (if available)
    // Note: Tesseract.js data structure may vary by version
    const wordConfidences: Array<{ word: string; confidence: number }> = [];
    let weightedConfidence = data.confidence / 100;

    // Try to access words if available (structure may vary)
    // Tesseract.js returns data with text and confidence, but word-level data structure varies
    // Use overall confidence as fallback
    if (data && typeof data === 'object') {
      // Check if words array exists (may be at different path depending on Tesseract version)
      const wordsData = (data as { words?: unknown[] }).words;
      if (wordsData && Array.isArray(wordsData)) {
        for (const word of wordsData) {
          if (word && typeof word === 'object' && 'text' in word) {
            const wordObj = word as { text?: string; confidence?: number };
            wordConfidences.push({
              word: String(wordObj.text || ''),
              confidence: (Number(wordObj.confidence) || 0) / 100,
            });
          }
        }

        // Calculate weighted confidence if words available
        const totalLength = wordConfidences.reduce((sum: number, w: { word: string }) => sum + w.word.length, 0);
        if (totalLength > 0) {
          weightedConfidence = wordConfidences.reduce(
            (sum: number, w: { word: string; confidence: number }) => sum + (w.confidence * w.word.length),
            0
          ) / totalLength;
        }
      }
    }

    return {
      text: data.text,
      confidence: weightedConfidence,
      wordConfidences,
    };
  } catch (_error) {
    console.error("Error in enhanced OCR extraction:", _error);
    throw new Error("Failed to extract text with OCR");
  }
}

/**
 * Enhanced PDF text extraction with fallback to OCR
 */
export async function extractTextFromPDFEnhanced(
  buffer: Buffer
): Promise<ExtractionResult> {
  try {
    // Try pdf-parse first (for PDFs with text layers)
    const pdfParseModule = await import("pdf-parse");
    const pdfParseFn =
      (pdfParseModule as { default?: unknown }).default ||
      (pdfParseModule as { pdfParse?: unknown }).pdfParse ||
      pdfParseModule;

    if (typeof pdfParseFn !== "function") {
      throw new Error("pdf-parse function not found");
    }

    const data = await (pdfParseFn as (buffer: Buffer) => Promise<{ text: string; numPages: number }>)(buffer);
    
    // If text extraction yields very little text, it's likely a scanned PDF
    if (!data.text || data.text.trim().length < 50) {
      throw new Error("PDF appears to be scanned, using OCR fallback");
    }

    return {
      text: data.text,
      confidence: 0.9, // PDF text extraction is highly accurate
      wordConfidences: [],
      pageCount: data.numPages,
    };
    } catch (_error) {
      // Fallback to OCR for scanned PDFs
      console.log("PDF text extraction failed, using OCR fallback...");
      return extractTextWithOCR(buffer, {
        psm: PSM.AUTO_OSD, // Auto-detect orientation and script
      });
    }
}

/**
 * Enhanced text parsing with improved patterns and confidence scoring
 */
export function parsePolicyTextEnhanced(
  text: string,
  ocrConfidence: number = 0.8
): EnhancedExtractedData {
  const extracted: EnhancedExtractedData = {
    policyNumber: null,
    policyType: null,
    faceAmount: null,
    premiumAmount: null,
    firstName: null,
    lastName: null,
    middleName: null,
    email: null,
    phone: null,
    dateOfBirth: null,
    ssnLast4: null,
    insurerName: null,
    insurerPhone: null,
    insurerEmail: null,
    insurerAddress: null,
    beneficiaries: [],
    extractionConfidence: 0,
    fieldConfidences: {},
    extractionMethod: "ocr",
    warnings: [],
  };

  // Normalize text
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  // Enhanced Policy Number extraction
  const policyNumberPatterns = [
    /policy\s*(?:number|#|no\.?|num|id)\s*:?\s*([A-Z0-9\-]{6,25})/i,
    /(?:policy|pol)\.?\s*(?:no|number|#|num|id)\s*:?\s*([A-Z0-9\-]{6,25})/i,
    /(?:certificate|cert|contract|account)\s*(?:number|#|no\.?|num|id)\s*:?\s*([A-Z0-9\-]{6,25})/i,
    /^([A-Z]{2,5}[-]?[0-9]{6,20})$/m,
    /\b([A-Z]{2,4}[-]?[0-9]{6,15})\b/,
  ];

  for (const pattern of policyNumberPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      const policyNum = match[1].trim();
      // Validate policy number format
      if (policyNum.length >= 6 && policyNum.length <= 25) {
        extracted.policyNumber = policyNum;
        extracted.fieldConfidences.policyNumber = 0.85 * ocrConfidence;
        break;
      }
    }
  }

  // Enhanced Name extraction
  const namePatterns = [
    /(?:insured|policyholder|owner|client|applicant|beneficiary)\s*:?\s*([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)/i,
    /(?:first\s+name|given\s+name|fname)\s*:?\s*([A-Z][a-z]{2,})/i,
    /(?:last\s+name|surname|family\s+name|lname)\s*:?\s*([A-Z][a-z]{2,})/i,
    /^([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)$/m,
  ];

  for (const pattern of namePatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      if (match[1] && match[2]) {
        const nameParts = match[2].trim().split(/\s+/);
        extracted.firstName = match[1].trim();
        if (nameParts.length > 1) {
          extracted.middleName = nameParts.slice(0, -1).join(" ");
          extracted.lastName = nameParts[nameParts.length - 1];
        } else {
          extracted.lastName = nameParts[0];
        }
        extracted.fieldConfidences.firstName = 0.8 * ocrConfidence;
        extracted.fieldConfidences.lastName = 0.8 * ocrConfidence;
        break;
      } else if (match[1] && pattern.source.includes("first")) {
        extracted.firstName = match[1].trim();
        extracted.fieldConfidences.firstName = 0.75 * ocrConfidence;
      } else if (match[1] && pattern.source.includes("last")) {
        extracted.lastName = match[1].trim();
        extracted.fieldConfidences.lastName = 0.75 * ocrConfidence;
      }
    }
  }

  // Enhanced Email extraction
  const emailPattern = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
  const emailMatches = Array.from(normalizedText.matchAll(emailPattern));
  if (emailMatches.length > 0) {
    // Use first email found (usually client email)
    extracted.email = emailMatches[0][1].trim().toLowerCase();
    extracted.fieldConfidences.email = 0.95; // Email format is very reliable
  }

  // Enhanced Phone extraction
  const phonePatterns = [
    /(?:phone|tel|telephone|mobile|cell)\s*:?\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i,
    /\b(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/,
    /\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/,
    /\b(\+?1[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/,
  ];

  for (const pattern of phonePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      const phone = match[1].replace(/\D/g, "");
      if (phone.length >= 10 && phone.length <= 11) {
        extracted.phone = match[1].trim();
        extracted.fieldConfidences.phone = 0.85 * ocrConfidence;
        break;
      }
    }
  }

  // Enhanced Date of Birth extraction
  const dobPatterns = [
    /(?:date\s+of\s+birth|dob|birth\s+date|born|birthday)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/,
    /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-]\d{2}\b/,
  ];

  for (const pattern of dobPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[0]) {
      try {
        const dateStr = match[0].trim();
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && date < new Date()) {
          extracted.dateOfBirth = date.toISOString().split("T")[0];
          extracted.fieldConfidences.dateOfBirth = 0.8 * ocrConfidence;
          break;
        }
      } catch {
        // Invalid date, continue
      }
    }
  }

  // Enhanced Policy Type extraction
  const policyTypePatterns = [
    /(?:policy\s+type|type\s+of\s+policy|coverage\s+type|plan\s+type)\s*:?\s*(term|whole\s+life|universal\s+life|variable\s+life|group|annuity|endowment)/i,
    /\b(term|whole\s+life|universal\s+life|variable\s+life|group|annuity|endowment)\s+(?:life\s+)?(?:insurance|policy)/i,
  ];

  for (const pattern of policyTypePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      const type = match[1].trim().toUpperCase().replace(/\s+/g, "_");
      extracted.policyType = type;
      extracted.fieldConfidences.policyType = 0.75 * ocrConfidence;
      break;
    }
  }

  // Enhanced Insurer Name extraction
  const insurerPatterns = [
    /(?:insurance\s+company|insurer|carrier|company|underwriter|provider)\s*:?\s*([A-Z][A-Za-z\s&.,'-]{5,}(?:Insurance|Life|Assurance|Group|Company|Corp|Inc|LLC|Mutual|National)?)/i,
    /^([A-Z][A-Za-z\s&.,'-]{5,}(?:Insurance|Life|Assurance|Group|Company|Corp|Inc|LLC|Mutual|National)?)/m,
    /([A-Z][A-Za-z\s&.,'-]{5,}(?:\s+Life\s+Insurance|\s+Insurance\s+Company|\s+Assurance))/i,
  ];

  const headerText = lines.slice(0, 20).join(" ");
  for (const pattern of insurerPatterns) {
    const match = headerText.match(pattern);
    if (match && match[1]) {
      const insurerName = match[1].trim();
      // Filter out false positives
      if (!insurerName.match(/^(Policy|Certificate|Contract|Date|Name|Address|Beneficiary)/i)) {
        extracted.insurerName = insurerName;
        extracted.fieldConfidences.insurerName = 0.7 * ocrConfidence;
        break;
      }
    }
  }

  // Enhanced Beneficiary extraction
  const beneficiaryPatterns = [
    /(?:beneficiary|beneficiaries?)\s*:?\s*([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})/gi,
    /(?:primary\s+beneficiary|contingent\s+beneficiary)\s*:?\s*([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})/gi,
  ];

  for (const pattern of beneficiaryPatterns) {
    const matches = Array.from(normalizedText.matchAll(pattern));
    for (const match of matches) {
      if (match[1] && match[2]) {
        // Try to find relationship and percentage
        const context = normalizedText.substring(
          Math.max(0, match.index! - 50),
          Math.min(normalizedText.length, match.index! + match[0].length + 50)
        );
        
        const relationshipMatch = context.match(/(?:relationship|relation)\s*:?\s*(\w+)/i);
        const percentageMatch = context.match(/(\d+)%/);

        extracted.beneficiaries.push({
          firstName: match[1].trim(),
          lastName: match[2].trim(),
          relationship: relationshipMatch ? relationshipMatch[1].trim() : null,
          percentage: percentageMatch ? percentageMatch[1].trim() : null,
        });
      }
    }
  }

  // Extract SSN last 4
  const ssnPattern = /\b\d{3}-\d{2}-(\d{4})\b/;
  const ssnMatch = normalizedText.match(ssnPattern);
  if (ssnMatch) {
    extracted.ssnLast4 = ssnMatch[1];
    extracted.fieldConfidences.ssnLast4 = 0.9;
  }

  // Extract Face Amount and Premium
  const faceAmountPattern = /(?:face\s+amount|death\s+benefit|coverage\s+amount|benefit\s+amount)\s*:?\s*\$?([\d,]+)/i;
  const faceMatch = normalizedText.match(faceAmountPattern);
  if (faceMatch) {
    extracted.faceAmount = faceMatch[1].replace(/,/g, "");
    extracted.fieldConfidences.faceAmount = 0.7 * ocrConfidence;
  }

  const premiumPattern = /(?:premium|annual\s+premium|monthly\s+premium)\s*:?\s*\$?([\d,]+\.?\d*)/i;
  const premiumMatch = normalizedText.match(premiumPattern);
  if (premiumMatch) {
    extracted.premiumAmount = premiumMatch[1].replace(/,/g, "");
    extracted.fieldConfidences.premiumAmount = 0.7 * ocrConfidence;
  }

  // Calculate overall extraction confidence
  const fieldScores = Object.values(extracted.fieldConfidences);
  const totalScore = fieldScores.reduce((sum, score) => sum + score, 0);
  const fieldCount = fieldScores.length;
  
  extracted.extractionConfidence = fieldCount > 0
    ? Math.min(totalScore / fieldCount, 1.0)
    : 0;

  // Add warnings for low confidence fields
  for (const [field, confidence] of Object.entries(extracted.fieldConfidences)) {
    if (confidence < 0.5) {
      extracted.warnings.push(`Low confidence for ${field} (${(confidence * 100).toFixed(0)}%)`);
    }
  }

  return extracted;
}

/**
 * Support for additional document formats
 */
export async function extractTextFromDocument(
  file: File,
  buffer: Buffer
): Promise<ExtractionResult> {
  const mimeType = file.type || file.name.split(".").pop()?.toLowerCase() || "";

  // PDF
  if (mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return extractTextFromPDFEnhanced(buffer);
  }

  // Images
  if (mimeType.startsWith("image/") || /\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/i.test(file.name)) {
    return extractTextWithOCR(buffer);
  }

  // Plain text
  if (mimeType === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
    return {
      text: buffer.toString("utf-8"),
      confidence: 1.0,
      wordConfidences: [],
    };
  }

  // DOCX (would require mammoth or similar)
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.toLowerCase().endsWith(".docx")) {
    // For now, throw error - can be implemented with mammoth library
    throw new Error("DOCX format not yet supported. Please convert to PDF or image.");
  }

  // Default: try OCR
  console.warn(`Unknown file type ${mimeType}, attempting OCR...`);
  return extractTextWithOCR(buffer);
}
