/**
 * Unit Tests: Email Functions
 * Tests for email sending functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail, sendEngagementEmail } from "../email";

// Mock Resend
const mockSend = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

describe("Email Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EMAIL_FROM = "test@heirvault.app";
    process.env.RESEND_API_KEY = "test-api-key";
  });

  describe("sendEmail", () => {
    it("should send email with required parameters", async () => {
      mockSend.mockResolvedValue({ id: "email-123" });

      await sendEmail({
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML</p>",
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith({
        from: "test@heirvault.app",
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML</p>",
      });
    });

    it("should send email with attachments", async () => {
      mockSend.mockResolvedValue({ id: "email-123" });
      const attachment = {
        filename: "test.pdf",
        content: Buffer.from("test content"),
      };

      await sendEmail({
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML</p>",
        attachments: [attachment],
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            {
              filename: "test.pdf",
              content: expect.any(String), // Base64 encoded
            },
          ],
        })
      );
    });

    it("should handle multiple attachments", async () => {
      mockSend.mockResolvedValue({ id: "email-123" });
      const attachments = [
        { filename: "file1.pdf", content: Buffer.from("content1") },
        { filename: "file2.pdf", content: Buffer.from("content2") },
      ];

      await sendEmail({
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML</p>",
        attachments,
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({ filename: "file1.pdf" }),
            expect.objectContaining({ filename: "file2.pdf" }),
          ]),
        })
      );
    });

    it("should encode attachment content as base64", async () => {
      mockSend.mockResolvedValue({ id: "email-123" });
      const content = Buffer.from("test content");
      const attachment = {
        filename: "test.pdf",
        content,
      };

      await sendEmail({
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML</p>",
        attachments: [attachment],
      });

      const call = mockSend.mock.calls[0][0];
      expect(call.attachments[0].content).toBe(content.toString("base64"));
    });
  });

  describe("sendEngagementEmail", () => {
    it("should send engagement email with client name", async () => {
      mockSend.mockResolvedValue({ id: "email-123" });

      await sendEngagementEmail({
        to: "client@example.com",
        clientName: "John Doe",
        uploadLink: "https://heirvault.app/upload/token123",
        registryId: "reg_123",
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "client@example.com",
          subject: "HeirVault: Upload your life insurance policies",
        })
      );

      const call = mockSend.mock.calls[0][0];
      expect(call.text).toContain("Hello John Doe,");
      expect(call.text).toContain("https://heirvault.app/upload/token123");
      expect(call.text).toContain("reg_123");
    });

    it("should send engagement email without client name", async () => {
      mockSend.mockResolvedValue({ id: "email-123" });

      await sendEngagementEmail({
        to: "client@example.com",
        uploadLink: "https://heirvault.app/upload/token123",
        registryId: "reg_123",
      });

      const call = mockSend.mock.calls[0][0];
      expect(call.text).toContain("Hello,");
      expect(call.text).not.toContain("Hello undefined,");
    });

    it("should include upload link in email", async () => {
      mockSend.mockResolvedValue({ id: "email-123" });
      const uploadLink = "https://heirvault.app/upload/unique-token-456";

      await sendEngagementEmail({
        to: "client@example.com",
        uploadLink,
        registryId: "reg_123",
      });

      const call = mockSend.mock.calls[0][0];
      expect(call.text).toContain(uploadLink);
    });

    it("should include registry ID in email", async () => {
      mockSend.mockResolvedValue({ id: "email-123" });

      await sendEngagementEmail({
        to: "client@example.com",
        uploadLink: "https://heirvault.app/upload/token123",
        registryId: "reg_unique_789",
      });

      const call = mockSend.mock.calls[0][0];
      expect(call.text).toContain("reg_unique_789");
    });

    it("should use correct from address", async () => {
      mockSend.mockResolvedValue({ id: "email-123" });
      process.env.MAIL_FROM = "custom@heirvault.app";

      await sendEngagementEmail({
        to: "client@example.com",
        uploadLink: "https://heirvault.app/upload/token123",
        registryId: "reg_123",
      });

      const call = mockSend.mock.calls[0][0];
      expect(call.from).toBe("custom@heirvault.app");
    });

    it("should fallback to EMAIL_FROM if MAIL_FROM not set", async () => {
      mockSend.mockResolvedValue({ id: "email-123" });
      delete process.env.MAIL_FROM;
      process.env.EMAIL_FROM = "fallback@heirvault.app";

      await sendEngagementEmail({
        to: "client@example.com",
        uploadLink: "https://heirvault.app/upload/token123",
        registryId: "reg_123",
      });

      const call = mockSend.mock.calls[0][0];
      expect(call.from).toBe("fallback@heirvault.app");
    });

    it("should use default from address if neither set", async () => {
      mockSend.mockResolvedValue({ id: "email-123" });
      delete process.env.MAIL_FROM;
      delete process.env.EMAIL_FROM;

      await sendEngagementEmail({
        to: "client@example.com",
        uploadLink: "https://heirvault.app/upload/token123",
        registryId: "reg_123",
      });

      const call = mockSend.mock.calls[0][0];
      expect(call.from).toBe("HeirVault <support@heirvault.app>");
    });
  });
});
