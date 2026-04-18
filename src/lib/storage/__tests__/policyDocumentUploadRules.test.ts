import { describe, it, expect } from "vitest";
import { HttpError } from "@/lib/permissions/guard";
import {
  normalizePolicyDocumentMimeType,
  validatePolicyDocumentUploadFile,
} from "../policyDocumentUploadRules";

describe("policyDocumentUploadRules", () => {
  it("infers PDF from file name when type is empty", () => {
    const f = new File([new Uint8Array([1])], "policy.PDF", { type: "" });
    expect(normalizePolicyDocumentMimeType(f)).toBe("application/pdf");
  });

  it("accepts declared image/png", () => {
    const f = new File([new Uint8Array([1, 2])], "x.bin", { type: "image/png" });
    expect(validatePolicyDocumentUploadFile(f).mimeType).toBe("image/png");
  });

  it("rejects empty file", () => {
    const f = new File([], "empty.pdf", { type: "application/pdf" });
    expect(() => validatePolicyDocumentUploadFile(f)).toThrow(HttpError);
  });

  it("rejects disallowed mime", () => {
    const f = new File([new Uint8Array([1])], "x.exe", { type: "application/octet-stream" });
    expect(() => validatePolicyDocumentUploadFile(f)).toThrow(HttpError);
  });
});
