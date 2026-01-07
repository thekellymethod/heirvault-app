/**
 * Confidence Scoring System for OCR and Document Extraction
 * Provides detailed confidence metrics for extracted data
 */

export interface FieldConfidence {
  field: string;
  value: string | null;
  confidence: number;
  method: "regex" | "ocr" | "textract" | "validation";
  warnings?: string[];
}

export interface ExtractionConfidenceReport {
  overallConfidence: number;
  fieldConfidences: FieldConfidence[];
  extractionMethod: string;
  qualityScore: number;
  recommendations: string[];
}

/**
 * Calculate confidence score for a specific field
 */
export function calculateFieldConfidence(
  field: string,
  value: string | null,
  method: "regex" | "ocr" | "textract" | "validation",
  ocrConfidence?: number
): FieldConfidence {
  let confidence = 0.5; // Default confidence

  if (!value) {
    return {
      field,
      value: null,
      confidence: 0,
      method,
      warnings: ["Field not found"],
    };
  }

  // Base confidence by method
  switch (method) {
    case "textract":
      confidence = 0.9;
      break;
    case "ocr":
      confidence = ocrConfidence || 0.7;
      break;
    case "regex":
      confidence = 0.75;
      break;
    case "validation":
      confidence = 0.95; // Validated data is highly confident
      break;
  }

  // Adjust confidence based on field-specific validation
  const warnings: string[] = [];

  switch (field) {
    case "email":
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(value)) {
        confidence = Math.min(confidence + 0.1, 1.0);
      } else {
        confidence = Math.max(confidence - 0.3, 0.1);
        warnings.push("Email format appears invalid");
      }
      break;

    case "phone":
      const phoneDigits = value.replace(/\D/g, "");
      if (phoneDigits.length >= 10 && phoneDigits.length <= 11) {
        confidence = Math.min(confidence + 0.1, 1.0);
      } else {
        confidence = Math.max(confidence - 0.2, 0.2);
        warnings.push("Phone number length appears incorrect");
      }
      break;

    case "policyNumber":
      if (value.length >= 6 && value.length <= 25) {
        confidence = Math.min(confidence + 0.05, 1.0);
      } else {
        confidence = Math.max(confidence - 0.2, 0.2);
        warnings.push("Policy number length appears unusual");
      }
      break;

    case "dateOfBirth":
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime()) && date < new Date()) {
          confidence = Math.min(confidence + 0.1, 1.0);
        } else {
          confidence = Math.max(confidence - 0.3, 0.1);
          warnings.push("Date appears invalid or in the future");
        }
      } catch {
        confidence = Math.max(confidence - 0.3, 0.1);
        warnings.push("Date format appears invalid");
      }
      break;

    case "firstName":
    case "lastName":
      if (value.length >= 2 && value.length <= 50 && /^[A-Za-z\s'-]+$/.test(value)) {
        confidence = Math.min(confidence + 0.05, 1.0);
      } else {
        confidence = Math.max(confidence - 0.2, 0.2);
        warnings.push("Name format appears unusual");
      }
      break;
  }

  return {
    field,
    value,
    confidence: Math.max(0, Math.min(1, confidence)),
    method,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Generate comprehensive confidence report
 */
export function generateConfidenceReport(
  extractedData: Record<string, string | null>,
  ocrConfidence: number,
  extractionMethod: string
): ExtractionConfidenceReport {
  const fieldConfidences: FieldConfidence[] = [];
  const recommendations: string[] = [];

  // Calculate confidence for each field
  for (const [field, value] of Object.entries(extractedData)) {
    const method = extractionMethod === "textract" ? "textract" : 
                   extractionMethod === "pdf-text" ? "regex" : "ocr";
    
    const fieldConf = calculateFieldConfidence(
      field,
      value,
      method,
      ocrConfidence
    );
    
    fieldConfidences.push(fieldConf);

    // Generate recommendations for low-confidence fields
    if (fieldConf.confidence < 0.5) {
      recommendations.push(`Review ${field} - low confidence (${(fieldConf.confidence * 100).toFixed(0)}%)`);
    }
    if (fieldConf.warnings && fieldConf.warnings.length > 0) {
      recommendations.push(`${field}: ${fieldConf.warnings.join(", ")}`);
    }
  }

  // Calculate overall confidence (weighted average)
  const weights: Record<string, number> = {
    policyNumber: 0.25,
    firstName: 0.15,
    lastName: 0.15,
    insurerName: 0.15,
    email: 0.1,
    phone: 0.1,
    dateOfBirth: 0.05,
    policyType: 0.05,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const fieldConf of fieldConfidences) {
    const weight = weights[fieldConf.field] || 0.05;
    weightedSum += fieldConf.confidence * weight;
    totalWeight += weight;
  }

  const overallConfidence = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Calculate quality score (0-100)
  const qualityScore = overallConfidence * 100;

  // Add general recommendations
  if (overallConfidence < 0.6) {
    recommendations.push("Overall extraction confidence is low. Consider manual review.");
  }
  if (ocrConfidence < 0.7 && extractionMethod === "ocr") {
    recommendations.push("OCR quality is low. Consider using a higher resolution image or scanned document.");
  }
  if (fieldConfidences.filter(f => f.value).length < 3) {
    recommendations.push("Few fields were extracted. Document may need manual entry.");
  }

  return {
    overallConfidence,
    fieldConfidences,
    extractionMethod,
    qualityScore,
    recommendations,
  };
}
