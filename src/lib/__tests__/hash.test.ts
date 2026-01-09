/**
 * Unit Tests: Hash Functions
 * Tests for sha256Buffer and sha256String functions
 */

import { describe, it, expect } from "vitest";
import { sha256Buffer, sha256String } from "../hash";

describe("Hash Functions", () => {
  describe("sha256String", () => {
    it("should hash a simple string correctly", async () => {
      const result = await sha256String("hello world");
      expect(result).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
    });

    it("should hash an empty string", async () => {
      const result = await sha256String("");
      expect(result).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    });

    it("should produce consistent hashes for the same input", async () => {
      const input = "test string";
      const hash1 = await sha256String(input);
      const hash2 = await sha256String(input);
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", async () => {
      const hash1 = await sha256String("input1");
      const hash2 = await sha256String("input2");
      expect(hash1).not.toBe(hash2);
    });

    it("should handle special characters", async () => {
      const result = await sha256String("test@#$%^&*()");
      expect(result).toHaveLength(64); // SHA-256 produces 64-character hex string
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle unicode characters", async () => {
      const result = await sha256String("测试 🚀");
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("sha256Buffer", () => {
    it("should hash a Buffer correctly", async () => {
      const buffer = Buffer.from("hello world", "utf-8");
      const result = await sha256Buffer(buffer);
      expect(result).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
    });

    it("should hash an ArrayBuffer correctly", async () => {
      const uint8Array = new TextEncoder().encode("hello world");
      const arrayBuffer = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength);
      const result = await sha256Buffer(arrayBuffer);
      expect(result).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
    });

    it("should hash an empty buffer", async () => {
      const buffer = Buffer.from("");
      const result = await sha256Buffer(buffer);
      expect(result).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    });

    it("should produce consistent hashes for the same buffer", async () => {
      const buffer = Buffer.from("test data");
      const hash1 = await sha256Buffer(buffer);
      const hash2 = await sha256Buffer(buffer);
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different buffers", async () => {
      const buffer1 = Buffer.from("data1");
      const buffer2 = Buffer.from("data2");
      const hash1 = await sha256Buffer(buffer1);
      const hash2 = await sha256Buffer(buffer2);
      expect(hash1).not.toBe(hash2);
    });

    it("should handle binary data", async () => {
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]);
      const result = await sha256Buffer(buffer);
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce same hash for string and equivalent buffer", async () => {
      const text = "test string";
      const stringHash = await sha256String(text);
      const bufferHash = await sha256Buffer(Buffer.from(text, "utf-8"));
      expect(stringHash).toBe(bufferHash);
    });
  });
});
