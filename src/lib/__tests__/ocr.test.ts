/**
 * Unit Tests: OCR Extraction Functions
 * Tests for OCR text extraction and parsing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractPolicyData } from "../ocr";
import { parsePolicyTextEnhanced } from "../ocr/enhanced-extraction";
import { generateConfidenceReport } from "../ocr/confidence-scoring";

// Mock Tesseract.js
vi.mock("tesseract.js", () => ({
  createWorker: vi.fn(() => Promise.resolve({
    setParameters: vi.fn(() => Promise.resolve()),
    recognize: vi.fn(() => Promise.resolve({
      data: {
        text: "Mock OCR Text",
        confidence: 85,
        words: [],
      },
    })),
    terminate: vi.fn(() => Promise.resolve()),
  })),
  PSM: {
    AUTO: 3,
    AUTO_OSD: 0,
  },
}));

// Mock pdf-parse
vi.mock("pdf-parse", () => ({
  default: vi.fn(() => Promise.resolve({
    text: "Mock PDF Text\nPolicy Number: POL-123456\nInsured: John Doe",
    numPages: 1,
  })),
}));

describe("OCR Extraction", () => {
  describe("parsePolicyTextEnhanced", () => {
    it("should extract policy number from text", () => {
      const text = "Policy Number: POL-123456\nInsured: John Doe";
      const result = parsePolicyTextEnhanced(text, 0.8);
      
      expect(result.policyNumber).toBe("POL-123456");
      expect(result.fieldConfidences.policyNumber).toBeDefined();
    });

    it("should extract first and last name", () => {
      const text = "Insured: John Michael Doe\nPolicy Number: POL-123";
      const result = parsePolicyTextEnhanced(text, 0.8);
      
      expect(result.firstName).toBe("John");
      expect(result.lastName).toBe("Doe");
      expect(result.middleName).toBe("Michael");
    });

    it("should extract email address", () => {
      const text = "Contact Email: john.doe@example.com\nPolicy: POL-123";
      const result = parsePolicyTextEnhanced(text, 0.8);
      
      expect(result.email).toBe("john.doe@example.com");
      expect(result.fieldConfidences.email).toBeGreaterThan(0.9);
    });

    it("should extract phone number", () => {
      const text = "Phone: (555) 123-4567\nPolicy: POL-123";
      const result = parsePolicyTextEnhanced(text, 0.8);
      
      expect(result.phone).toBeDefined();
      expect(result.fieldConfidences.phone).toBeDefined();
    });

    it("should extract date of birth", () => {
      const text = "Date of Birth: 01/15/1980\nPolicy: POL-123";
      const result = parsePolicyTextEnhanced(text, 0.8);
      
      expect(result.dateOfBirth).toBeDefined();
      expect(result.fieldConfidences.dateOfBirth).toBeDefined();
    });

    it("should extract insurer name", () => {
      const text = "MetLife Insurance Company\nPolicy Number: POL-123\nInsured: John Doe";
      const result = parsePolicyTextEnhanced(text, 0.8);
      
      expect(result.insurerName).toContain("MetLife");
      expect(result.fieldConfidences.insurerName).toBeDefined();
    });

    it("should extract policy type", () => {
      const text = "Policy Type: Whole Life\nPolicy Number: POL-123";
      const result = parsePolicyTextEnhanced(text, 0.8);
      
      expect(result.policyType).toBe("WHOLE_LIFE");
    });

    it("should extract beneficiaries", () => {
      const text = "Primary Beneficiary: Jane Doe\nRelationship: Spouse\nPercentage: 100%";
      const result = parsePolicyTextEnhanced(text, 0.8);
      
      expect(result.beneficiaries.length).toBeGreaterThan(0);
      expect(result.beneficiaries[0].firstName).toBe("Jane");
      expect(result.beneficiaries[0].lastName).toBe("Doe");
    });

    it("should calculate extraction confidence", () => {
      const text = "Policy Number: POL-123\nInsured: John Doe\nEmail: john@example.com";
      const result = parsePolicyTextEnhanced(text, 0.8);
      
      expect(result.extractionConfidence).toBeGreaterThan(0);
      expect(result.extractionConfidence).toBeLessThanOrEqual(1);
    });

    it("should handle empty text", () => {
      const result = parsePolicyTextEnhanced("", 0.8);
      
      expect(result.policyNumber).toBeNull();
      expect(result.firstName).toBeNull();
      expect(result.extractionConfidence).toBe(0);
    });

    it("should add warnings for low confidence fields", () => {
      const text = "Policy: POL"; // Incomplete policy number
      const result = parsePolicyTextEnhanced(text, 0.5);
      
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("generateConfidenceReport", () => {
    it("should generate confidence report for extracted data", () => {
      const extractedData = {
        policyNumber: "POL-123456",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "555-123-4567",
      };
      
      const report = generateConfidenceReport(extractedData, 0.8, "ocr");
      
      expect(report.overallConfidence).toBeGreaterThan(0);
      expect(report.overallConfidence).toBeLessThanOrEqual(1);
      expect(report.qualityScore).toBeGreaterThan(0);
      expect(report.qualityScore).toBeLessThanOrEqual(100);
      expect(report.fieldConfidences.length).toBeGreaterThan(0);
    });

    it("should include recommendations for low confidence", () => {
      const extractedData = {
        policyNumber: "POL", // Low confidence
        firstName: null,
        lastName: null,
      };
      
      const report = generateConfidenceReport(extractedData, 0.5, "ocr");
      
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it("should validate email format", () => {
      const extractedData = {
        email: "invalid-email",
      };
      
      const report = generateConfidenceReport(extractedData, 0.8, "ocr");
      const emailField = report.fieldConfidences.find(f => f.field === "email");
      
      expect(emailField?.warnings).toBeDefined();
      expect(emailField?.warnings?.some(w => w.includes("format"))).toBe(true);
    });

    it("should validate phone number format", () => {
      const extractedData = {
        phone: "123", // Too short
      };
      
      const report = generateConfidenceReport(extractedData, 0.8, "ocr");
      const phoneField = report.fieldConfidences.find(f => f.field === "phone");
      
      expect(phoneField?.warnings).toBeDefined();
    });
  });

  describe("extractPolicyData", () => {
    it("should extract data from PDF", async () => {
      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      const buffer = Buffer.from("test pdf content");
      
      const result = await extractPolicyData(file, buffer);
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should extract data from image", async () => {
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      const buffer = Buffer.from("test image content");
      
      const result = await extractPolicyData(file, buffer);
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should handle unsupported file type", async () => {
      const file = new File(["test"], "test.xyz", { type: "application/unknown" });
      const buffer = Buffer.from("test content");
      
      await expect(extractPolicyData(file, buffer)).rejects.toThrow();
    });
  });
});
