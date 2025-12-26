"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";

type Beneficiary = {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string | null;
};

type PolicyBeneficiaryRow = {
  id: string;
  beneficiaryId: string;
  beneficiary: Beneficiary;
};

type Props = {
  policyId: string;
};

type ApiError = {
  error?: string;
};

type GetPolicyBeneficiariesResponse = {
  beneficiaries: PolicyBeneficiaryRow[];
  error?: string;
};

type CreateBeneficiaryPayload = {
  firstName: string;
  lastName: string;
  relationship: string | null;
};

type CreateBeneficiaryResponse = {
  beneficiary?: Beneficiary;
  error?: string;
};

type AttachResponse = {
  attached?: boolean;
  error?: string;
};

type RemoveResponse = {
  removed?: boolean;
  error?: string;
};

function safeString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asApiError(v: unknown): ApiError {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  return { error: typeof o.error === "string" ? o.error : undefined };
}

function isGetResponse(v: unknown): v is GetPolicyBeneficiariesResponse {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return Array.isArray(o.beneficiaries);
}

export function PolicyBeneficiariesManager({ policyId }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [rows, setRows] = React.useState<PolicyBeneficiaryRow[]>([]);

  const [newFirstName, setNewFirstName] = React.useState("");
  const [newLastName, setNewLastName] = React.useState("");
  const [newRelationship, setNewRelationship] = React.useState<string>("");

  const canAdd =
    newFirstName.trim().length > 0 && newLastName.trim().length > 0 && !saving;

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/policies/${encodeURIComponent(policyId)}/beneficiaries`, {
        method: "GET",
      });

      const json = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) {
        const err = asApiError(json);
        throw new Error(err.error || "Failed to load beneficiaries.");
      }

      if (!isGetResponse(json)) {
        throw new Error("Unexpected API response shape.");
      }

      setRows(json.beneficiaries);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }, [policyId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    if (!canAdd) return;

    setSaving(true);
    setError(null);

    try {
      // 1) Create beneficiary
      const payload: CreateBeneficiaryPayload = {
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        relationship: newRelationship.trim() || null,
      };

      const createRes = await fetch(`/api/beneficiaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const createJson = (await createRes.json().catch(() => ({}))) as CreateBeneficiaryResponse;

      if (!createRes.ok) {
        throw new Error(createJson.error || "Failed to create beneficiary.");
      }

      const created = createJson.beneficiary;
      if (!created) throw new Error("Beneficiary creation succeeded but returned no beneficiary.");

      // 2) Attach beneficiary to policy
      const attachRes = await fetch(
        `/api/policies/${encodeURIComponent(policyId)}/beneficiaries/attach`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ beneficiaryId: created.id }),
        }
      );

      const attachJson = (await attachRes.json().catch(() => ({}))) as AttachResponse;

      if (!attachRes.ok) {
        throw new Error(attachJson.error || "Failed to attach beneficiary to policy.");
      }

      // 3) Refresh list
      setNewFirstName("");
      setNewLastName("");
      setNewRelationship("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(policyBeneficiaryId: string) {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/policies/${encodeURIComponent(policyId)}/beneficiaries/${encodeURIComponent(
          policyBeneficiaryId
        )}`,
        { method: "DELETE" }
      );

      const json = (await res.json().catch(() => ({}))) as RemoveResponse;

      if (!res.ok) {
        throw new Error(json.error || "Failed to remove beneficiary.");
      }

      // optimistic update
      setRows((prev) => prev.filter((r) => r.id !== policyBeneficiaryId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Beneficiaries</h2>
            <p className="mt-1 text-sm text-slateui-600">
              Add, view, and remove beneficiaries attached to this policy.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={load} disabled={loading || saving}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slateui-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading beneficiaries...
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slateui-600">No beneficiaries yet.</div>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slateui-200 bg-white p-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-ink-900 truncate">
                      {row.beneficiary.firstName} {row.beneficiary.lastName}
                    </div>
                    <div className="text-xs text-slateui-600">
                      Relationship: {row.beneficiary.relationship ?? "—"}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRemove(row.id)}
                    disabled={saving}
                    aria-label="Remove beneficiary"
                    title="Remove beneficiary"
                    className="btn-secondary"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink-900">Add Beneficiary</h3>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <div className="label mb-1">First name</div>
            <input
              className="input"
              value={newFirstName}
              onChange={(e) => setNewFirstName(safeString(e.target.value))}
              required
              aria-label="Beneficiary first name"
            />
          </label>

          <label className="block">
            <div className="label mb-1">Last name</div>
            <input
              className="input"
              value={newLastName}
              onChange={(e) => setNewLastName(safeString(e.target.value))}
              required
              aria-label="Beneficiary last name"
            />
          </label>

          <label className="block">
            <div className="label mb-1">Relationship</div>
            <input
              className="input"
              value={newRelationship}
              onChange={(e) => setNewRelationship(safeString(e.target.value))}
              placeholder="Spouse, Child, Trust, etc."
              aria-label="Beneficiary relationship"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setNewFirstName("");
              setNewLastName("");
              setNewRelationship("");
            }}
            disabled={saving}
            className="btn-secondary"
          >
            Clear
          </Button>

          <Button type="button" onClick={handleAdd} disabled={!canAdd} className="btn-primary">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Beneficiary
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
