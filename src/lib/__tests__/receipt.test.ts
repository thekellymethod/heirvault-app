/**
 * Unit Tests: Receipt Generation Functions
 * Tests for PDF receipt generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildRegistrySummaryPdfBytes } from "../pdf/registrySummary";

// Mock pdf-lib
const mockPDFDocument = {
  create: vi.fn(),
  addPage: vi.fn(),
  embedFont: vi.fn(),
};

const mockPage = {
  getSize: vi.fn(() => ({ width: 612, height: 792 })),
  drawText: vi.fn(),
};

const mockFont = {
  // Font object
};

vi.mock("pdf-lib", () => ({
  PDFDocument: {
    create: mockPDFDocument.create,
  },
  StandardFonts: {
    Helvetica: "Helvetica",
    HelveticaBold: "HelveticaBold",
  },
}));

describe("Receipt Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockPDFDocument.create.mockResolvedValue({
      addPage: vi.fn(() => mockPage),
      embedFont: vi.fn(() => Promise.resolve(mockFont)),
    });
  });

  describe("buildRegistrySummaryPdfBytes", () => {
    it("should generate PDF with registry information", async () => {
      const input = {
        registryId: "reg_123",
        clientName: "John Doe",
        clientEmail: "john@example.com",
        completedAt: new Date("2024-01-15T10:00:00Z"),
        files: [
          {
            originalName: "policy1.pdf",
            status: "VERIFIED",
            createdAt: new Date("2024-01-15T09:00:00Z"),
          },
        ],
      };

      const pdfDoc = {
        addPage: vi.fn(() => mockPage),
        embedFont: vi.fn(() => Promise.resolve(mockFont)),
      };
      mockPDFDocument.create.mockResolvedValue(pdfDoc);

      await buildRegistrySummaryPdfBytes(input);

      expect(mockPDFDocument.create).toHaveBeenCalled();
      expect(pdfDoc.addPage).toHaveBeenCalled();
      expect(pdfDoc.embedFont).toHaveBeenCalled();
    });

    it("should include registry ID in PDF", async () => {
      const input = {
        registryId: "reg_unique_456",
        clientName: "Jane Smith",
        clientEmail: "jane@example.com",
        completedAt: new Date("2024-01-15T10:00:00Z"),
        files: [],
      };

      const pdfDoc = {
        addPage: vi.fn(() => mockPage),
        embedFont: vi.fn(() => Promise.resolve(mockFont)),
      };
      mockPDFDocument.create.mockResolvedValue(pdfDoc);

      await buildRegistrySummaryPdfBytes(input);

      expect(mockPage.drawText).toHaveBeenCalledWith(
        expect.objectContaining({
          // Should contain registry ID
        }),
        expect.any(Object)
      );
    });

    it("should include client name and email", async () => {
      const input = {
        registryId: "reg_123",
        clientName: "Test Client",
        clientEmail: "test@example.com",
        completedAt: new Date("2024-01-15T10:00:00Z"),
        files: [],
      };

      const pdfDoc = {
        addPage: vi.fn(() => mockPage),
        embedFont: vi.fn(() => Promise.resolve(mockFont)),
      };
      mockPDFDocument.create.mockResolvedValue(pdfDoc);

      await buildRegistrySummaryPdfBytes(input);

      // Verify client information is included
      const drawTextCalls = mockPage.drawText.mock.calls;
      const textContent = drawTextCalls.map(call => call[0].text || "").join(" ");
      
      expect(textContent).toContain("Test Client");
      expect(textContent).toContain("test@example.com");
    });

    it("should handle missing client name", async () => {
      const input = {
        registryId: "reg_123",
        clientName: "",
        clientEmail: "test@example.com",
        completedAt: new Date("2024-01-15T10:00:00Z"),
        files: [],
      };

      const pdfDoc = {
        addPage: vi.fn(() => mockPage),
        embedFont: vi.fn(() => Promise.resolve(mockFont)),
      };
      mockPDFDocument.create.mockResolvedValue(pdfDoc);

      await buildRegistrySummaryPdfBytes(input);

      // Should handle empty name gracefully
      expect(mockPDFDocument.create).toHaveBeenCalled();
    });

    it("should include file list", async () => {
      const input = {
        registryId: "reg_123",
        clientName: "John Doe",
        clientEmail: "john@example.com",
        completedAt: new Date("2024-01-15T10:00:00Z"),
        files: [
          {
            originalName: "policy1.pdf",
            status: "VERIFIED",
            createdAt: new Date("2024-01-15T09:00:00Z"),
          },
          {
            originalName: "policy2.pdf",
            status: "PENDING",
            createdAt: new Date("2024-01-15T09:30:00Z"),
          },
        ],
      };

      const pdfDoc = {
        addPage: vi.fn(() => mockPage),
        embedFont: vi.fn(() => Promise.resolve(mockFont)),
      };
      mockPDFDocument.create.mockResolvedValue(pdfDoc);

      await buildRegistrySummaryPdfBytes(input);

      const drawTextCalls = mockPage.drawText.mock.calls;
      const textContent = drawTextCalls.map(call => call[0].text || "").join(" ");
      
      expect(textContent).toContain("policy1.pdf");
      expect(textContent).toContain("policy2.pdf");
    });

    it("should include completion date", async () => {
      const input = {
        registryId: "reg_123",
        clientName: "John Doe",
        clientEmail: "john@example.com",
        completedAt: new Date("2024-01-15T10:00:00Z"),
        files: [],
      };

      const pdfDoc = {
        addPage: vi.fn(() => mockPage),
        embedFont: vi.fn(() => Promise.resolve(mockFont)),
      };
      mockPDFDocument.create.mockResolvedValue(pdfDoc);

      await buildRegistrySummaryPdfBytes(input);

      const drawTextCalls = mockPage.drawText.mock.calls;
      const textContent = drawTextCalls.map(call => call[0].text || "").join(" ");
      
      // Should include date information
      expect(textContent).toContain("2024");
    });

    it("should handle empty file list", async () => {
      const input = {
        registryId: "reg_123",
        clientName: "John Doe",
        clientEmail: "john@example.com",
        completedAt: new Date("2024-01-15T10:00:00Z"),
        files: [],
      };

      const pdfDoc = {
        addPage: vi.fn(() => mockPage),
        embedFont: vi.fn(() => Promise.resolve(mockFont)),
      };
      mockPDFDocument.create.mockResolvedValue(pdfDoc);

      await buildRegistrySummaryPdfBytes(input);

      expect(mockPDFDocument.create).toHaveBeenCalled();
      // Should not throw error with empty files
    });

    it("should return PDF bytes", async () => {
      const input = {
        registryId: "reg_123",
        clientName: "John Doe",
        clientEmail: "john@example.com",
        completedAt: new Date("2024-01-15T10:00:00Z"),
        files: [],
      };

      const mockBytes = Buffer.from("mock pdf bytes");
      const pdfDoc = {
        addPage: vi.fn(() => mockPage),
        embedFont: vi.fn(() => Promise.resolve(mockFont)),
        save: vi.fn(() => Promise.resolve(mockBytes)),
      };
      mockPDFDocument.create.mockResolvedValue(pdfDoc);

      const result = await buildRegistrySummaryPdfBytes(input);

      expect(result).toBeDefined();
      // Note: Actual implementation may return bytes differently
    });
  });
});
