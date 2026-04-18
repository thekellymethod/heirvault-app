import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "@/lib/permissions/guard";

const findUniqueMock = vi.fn();
const requireOrgMemberMock = vi.fn();
const isAdminMock = vi.fn();

vi.mock("@/lib/db", () => ({
  findUnique: (table: string, where: Record<string, unknown>) => findUniqueMock(table, where),
}));

vi.mock("@/lib/authz", () => ({
  requireOrgMemberHttp: async (orgId: string) => {
    try {
      await requireOrgMemberMock(orgId);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "UNAUTHENTICATED") {
        throw new HttpError(401, "Unauthorized");
      }
      if (e instanceof Error && e.message === "FORBIDDEN") {
        throw new HttpError(403, "Forbidden");
      }
      throw e;
    }
  },
}));

vi.mock("@/lib/admin", () => ({
  isAdmin: () => isAdminMock(),
}));

const FIRM = "11111111-1111-4111-8111-111111111111";
const ESTATE = "22222222-2222-4222-8222-222222222222";
const POLICY = "33333333-3333-4333-8333-333333333333";
const OTHER_FIRM = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DOC_ID = "44444444-4444-4444-8444-444444444444";

describe("policyDocumentAccess", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    requireOrgMemberMock.mockReset();
    isAdminMock.mockReset();
    isAdminMock.mockResolvedValue(false);
    requireOrgMemberMock.mockResolvedValue({ userId: "clerk", role: "member" });
  });

  it("rejects invalid UUID inputs with ZodError", async () => {
    const { assertPolicyDocumentPathAccess } = await import("../policyDocumentAccess");
    await expect(
      assertPolicyDocumentPathAccess({ firmId: "nope", estateId: ESTATE, policyId: POLICY })
    ).rejects.toMatchObject({ name: "ZodError" });
  });

  it("rejects wrong estateId for a real policy (client mismatch)", async () => {
    const { assertPolicyDocumentPathAccess } = await import("../policyDocumentAccess");
    findUniqueMock.mockImplementation(async (table: string) => {
      if (table === "policies") return { id: POLICY, client_id: ESTATE };
      if (table === "clients") return { id: ESTATE, org_id: FIRM };
      return null;
    });

    await expect(
      assertPolicyDocumentPathAccess({
        firmId: FIRM,
        estateId: "55555555-5555-4555-8555-555555555555",
        policyId: POLICY,
      })
    ).rejects.toThrow(HttpError);
  });

  it("rejects policy not owned by firm (org mismatch)", async () => {
    const { assertPolicyDocumentPathAccess } = await import("../policyDocumentAccess");
    findUniqueMock.mockImplementation(async (table: string) => {
      if (table === "policies") return { id: POLICY, client_id: ESTATE };
      if (table === "clients") return { id: ESTATE, org_id: OTHER_FIRM };
      return null;
    });

    await expect(
      assertPolicyDocumentPathAccess({ firmId: FIRM, estateId: ESTATE, policyId: POLICY })
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects unknown policyId", async () => {
    const { assertPolicyDocumentPathAccess } = await import("../policyDocumentAccess");
    findUniqueMock.mockImplementation(async (table: string) => {
      if (table === "policies") return null;
      return null;
    });

    await expect(
      assertPolicyDocumentPathAccess({ firmId: FIRM, estateId: ESTATE, policyId: POLICY })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("allows valid member with valid graph", async () => {
    const { assertPolicyDocumentPathAccess } = await import("../policyDocumentAccess");
    findUniqueMock.mockImplementation(async (table: string) => {
      if (table === "policies") return { id: POLICY, client_id: ESTATE };
      if (table === "clients") return { id: ESTATE, org_id: FIRM };
      return null;
    });

    await expect(
      assertPolicyDocumentPathAccess({ firmId: FIRM, estateId: ESTATE, policyId: POLICY })
    ).resolves.toBeUndefined();
    expect(requireOrgMemberMock).toHaveBeenCalledWith(FIRM);
  });

  it("admin skips org membership but still requires valid graph", async () => {
    const { assertPolicyDocumentPathAccess } = await import("../policyDocumentAccess");
    isAdminMock.mockResolvedValue(true);
    findUniqueMock.mockImplementation(async (table: string) => {
      if (table === "policies") return { id: POLICY, client_id: ESTATE };
      if (table === "clients") return { id: ESTATE, org_id: FIRM };
      return null;
    });

    await assertPolicyDocumentPathAccess({ firmId: FIRM, estateId: ESTATE, policyId: POLICY });
    expect(requireOrgMemberMock).not.toHaveBeenCalled();
  });

  it("admin cannot bypass invalid graph", async () => {
    const { assertPolicyDocumentPathAccess } = await import("../policyDocumentAccess");
    isAdminMock.mockResolvedValue(true);
    findUniqueMock.mockImplementation(async (table: string) => {
      if (table === "policies") return null;
      return null;
    });

    await expect(
      assertPolicyDocumentPathAccess({ firmId: FIRM, estateId: ESTATE, policyId: POLICY })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("loadPolicyDocumentForAccess returns 403 when firmId does not match row (cross-tenant)", async () => {
    const { loadPolicyDocumentForAccess } = await import("../policyDocumentAccess");
    findUniqueMock.mockImplementation(async (table: string) => {
      if (table === "policy_documents") {
        return {
          id: DOC_ID,
          firm_id: OTHER_FIRM,
          estate_id: ESTATE,
          policy_id: POLICY,
          file_path: `${OTHER_FIRM}/${ESTATE}/${POLICY}/policy-document/x.pdf`,
        };
      }
      if (table === "policies") return { id: POLICY, client_id: ESTATE };
      if (table === "clients") return { id: ESTATE, org_id: OTHER_FIRM };
      return null;
    });

    await expect(loadPolicyDocumentForAccess(DOC_ID, FIRM)).rejects.toMatchObject({ status: 403 });
  });

  it("loadPolicyDocumentForAccess returns 404 when document missing", async () => {
    const { loadPolicyDocumentForAccess } = await import("../policyDocumentAccess");
    findUniqueMock.mockImplementation(async (table: string) => {
      if (table === "policy_documents") return null;
      return null;
    });

    await expect(loadPolicyDocumentForAccess(DOC_ID, FIRM)).rejects.toMatchObject({ status: 404 });
  });

  it("resolveCanonicalPolicyDocumentUploadIds returns DB-sourced UUIDs", async () => {
    const { resolveCanonicalPolicyDocumentUploadIds } = await import("../policyDocumentAccess");
    findUniqueMock.mockImplementation(async (table: string) => {
      if (table === "policies") return { id: POLICY, client_id: ESTATE };
      if (table === "clients") return { id: ESTATE, org_id: FIRM };
      return null;
    });

    const upper = FIRM.toUpperCase();
    const out = await resolveCanonicalPolicyDocumentUploadIds({
      firmId: upper,
      estateId: ESTATE,
      policyId: POLICY,
    });
    expect(out.firmId).toBe(FIRM);
    expect(out.estateId).toBe(ESTATE);
    expect(out.policyId).toBe(POLICY);
  });
});
