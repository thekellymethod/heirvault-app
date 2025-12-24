"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, X, ArrowLeft, UserCheck, Users } from "lucide-react";

type Attached = {
  linkId: string;
  attachedAt: string;
  id: string;
  firstName: string;
  lastName: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
};

type Available = {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string | null;
  email: string | null;
};

type PolicyInfo = {
  id: string;
  clientId: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
  };
  insurer: {
    id: string;
    name: string;
  };
  policyNumber: string | null;
  policyType: string | null;
};

export default function PolicyBeneficiariesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const policyId = params.id;

  const [policyInfo, setPolicyInfo] = React.useState<PolicyInfo | null>(null);
  const [attached, setAttached] = React.useState<Attached[]>([]);
  const [available, setAvailable] = React.useState<Available[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  
  // Form state for creating new beneficiary
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [newBeneficiary, setNewBeneficiary] = React.useState({
    firstName: "",
    lastName: "",
    relationship: "",
    email: "",
    phone: "",
    dateOfBirth: "",
  });

  const loadPolicyInfo = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/policies/${policyId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load policy");
      setPolicyInfo(data);
    } catch (e) {
      console.error("Failed to load policy info:", e);
    }
  }, [policyId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/policies/${policyId}/beneficiaries`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load policy beneficiaries");
      setAttached(data.attached || []);
      setAvailable(data.available || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [policyId]);

  React.useEffect(() => {
    loadPolicyInfo();
    load();
  }, [loadPolicyInfo, load]);

  async function attachBeneficiary(beneficiaryId: string) {
    setBusyId(beneficiaryId);
    setError(null);
    try {
      const res = await fetch(`/api/policies/${policyId}/beneficiaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beneficiaryId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to attach beneficiary");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  }

  async function detachBeneficiary(beneficiaryId: string) {
    setBusyId(beneficiaryId);
    setError(null);
    try {
      const res = await fetch(`/api/policies/${policyId}/beneficiaries`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beneficiaryId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to detach beneficiary");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  }

  async function createAndAttachBeneficiary(e: React.FormEvent) {
    e.preventDefault();
    if (!policyInfo) {
      setError("Policy information not loaded");
      return;
    }

    if (!newBeneficiary.firstName.trim() || !newBeneficiary.lastName.trim()) {
      setError("First name and last name are required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Step 1: Create beneficiary
      const createRes = await fetch("/api/beneficiaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: policyInfo.clientId,
          firstName: newBeneficiary.firstName.trim(),
          lastName: newBeneficiary.lastName.trim(),
          relationship: newBeneficiary.relationship.trim() || null,
          email: newBeneficiary.email.trim() || null,
          phone: newBeneficiary.phone.trim() || null,
          dateOfBirth: newBeneficiary.dateOfBirth || null,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData?.error || "Failed to create beneficiary");

      // Step 2: Attach to policy
      await attachBeneficiary(createData.id);

      // Step 3: Reset form
      setNewBeneficiary({
        firstName: "",
        lastName: "",
        relationship: "",
        email: "",
        phone: "",
        dateOfBirth: "",
      });
      setShowCreateForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create beneficiary");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push(policyInfo ? `/dashboard/clients/${policyInfo.clientId}` : "/dashboard/clients")}
              className="btn-secondary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900">Policy Beneficiaries</h1>
              <p className="mt-2 text-base text-slateui-600">
                {policyInfo
                  ? `Manage beneficiaries for ${policyInfo.client.firstName} ${policyInfo.client.lastName}'s policy`
                  : "Attach or remove beneficiaries from this policy."}
              </p>
              {policyInfo && (
                <div className="mt-2 text-sm text-slateui-600">
                  <span className="font-medium">{policyInfo.insurer.name}</span>
                  {policyInfo.policyNumber && (
                    <>
                      <span className="text-slateui-300 mx-2">•</span>
                      <span>Policy #{policyInfo.policyNumber}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Create New Beneficiary Form */}
        {showCreateForm && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold text-ink-900">Add New Beneficiary</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewBeneficiary({
                    firstName: "",
                    lastName: "",
                    relationship: "",
                    email: "",
                    phone: "",
                    dateOfBirth: "",
                  });
                }}
                className="text-slateui-400 hover:text-ink-900 transition"
                aria-label="Close form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={createAndAttachBeneficiary} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <label className="label mb-1 block">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newBeneficiary.firstName}
                    onChange={(e) => setNewBeneficiary((s) => ({ ...s, firstName: e.target.value }))}
                    required
                    className="input"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="label mb-1 block">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newBeneficiary.lastName}
                    onChange={(e) => setNewBeneficiary((s) => ({ ...s, lastName: e.target.value }))}
                    required
                    className="input"
                    placeholder="Enter last name"
                  />
                </div>
                <div>
                  <label htmlFor="beneficiary-relationship" className="label mb-1 block">Relationship</label>
                  <select
                    id="beneficiary-relationship"
                    value={newBeneficiary.relationship}
                    onChange={(e) => setNewBeneficiary((s) => ({ ...s, relationship: e.target.value }))}
                    className="input"
                  >
                    <option value="">Select relationship</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Grandchild">Grandchild</option>
                    <option value="Trust">Trust</option>
                    <option value="Estate">Estate</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label mb-1 block">Email</label>
                  <input
                    type="email"
                    value={newBeneficiary.email}
                    onChange={(e) => setNewBeneficiary((s) => ({ ...s, email: e.target.value }))}
                    className="input"
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label className="label mb-1 block">Phone</label>
                  <input
                    type="tel"
                    value={newBeneficiary.phone}
                    onChange={(e) => setNewBeneficiary((s) => ({ ...s, phone: e.target.value }))}
                    className="input"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label htmlFor="beneficiary-dob" className="label mb-1 block">Date of Birth</label>
                  <input
                    id="beneficiary-dob"
                    type="date"
                    value={newBeneficiary.dateOfBirth}
                    onChange={(e) => setNewBeneficiary((s) => ({ ...s, dateOfBirth: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewBeneficiary({
                      firstName: "",
                      lastName: "",
                      relationship: "",
                      email: "",
                      phone: "",
                      dateOfBirth: "",
                    });
                  }}
                  disabled={creating}
                  className="btn-secondary"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="btn-primary">
                  {creating ? "Creating..." : "Create & Attach"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {!showCreateForm && (
          <div>
            <Button onClick={() => setShowCreateForm(true)} className="btn-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add New Beneficiary
            </Button>
          </div>
        )}

        {/* Beneficiaries Sections */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Attached Beneficiaries */}
          <section className="card overflow-hidden p-0">
            <div className="border-b border-slateui-200 px-6 py-4 flex items-center gap-2 bg-paper-50">
              <UserCheck className="h-5 w-5 text-gold-500" />
              <div className="text-sm font-semibold text-ink-900">
                Attached ({attached.length})
              </div>
            </div>
            <div className="divide-y divide-slateui-200">
              {loading ? (
                <div className="p-8 text-center text-slateui-600">Loading...</div>
              ) : attached.length === 0 ? (
                <div className="p-8 text-center text-slateui-600">None attached yet.</div>
              ) : (
                attached.map((b) => (
                  <div key={b.id} className="p-5 flex items-center justify-between gap-4 hover:bg-paper-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-semibold text-ink-900">
                          {b.firstName} {b.lastName}
                        </div>
                        {b.relationship && (
                          <span className="text-xs text-slateui-600 bg-paper-100 px-2 py-0.5 rounded">
                            {b.relationship}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slateui-600">
                        {b.email || "No email"}
                        {b.phone && ` • ${b.phone}`}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      disabled={busyId === b.id}
                      onClick={() => detachBeneficiary(b.id)}
                      className="btn-secondary"
                    >
                      {busyId === b.id ? "Removing..." : "Remove"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Available Beneficiaries */}
          <section className="card overflow-hidden p-0">
            <div className="border-b border-slateui-200 px-6 py-4 flex items-center gap-2 bg-paper-50">
              <Users className="h-5 w-5 text-gold-500" />
              <div className="text-sm font-semibold text-ink-900">
                Available ({available.length})
              </div>
            </div>
            <div className="divide-y divide-slateui-200">
              {loading ? (
                <div className="p-8 text-center text-slateui-600">Loading...</div>
              ) : available.length === 0 ? (
                <div className="p-8 text-center text-slateui-600">
                  <p className="mb-2">No available beneficiaries.</p>
                  <p className="text-xs text-slateui-500">
                    {"Click \"Add New Beneficiary\" above to create one for this policy."}
                  </p>
                </div>
              ) : (
                available.map((b) => (
                  <div key={b.id} className="p-5 flex items-center justify-between gap-4 hover:bg-paper-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-semibold text-ink-900">
                          {b.firstName} {b.lastName}
                        </div>
                        {b.relationship && (
                          <span className="text-xs text-slateui-600 bg-paper-100 px-2 py-0.5 rounded">
                            {b.relationship}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slateui-600">{b.email || "No email"}</div>
                    </div>
                    <Button
                      disabled={busyId === b.id}
                      onClick={() => attachBeneficiary(b.id)}
                      className="btn-primary"
                    >
                      {busyId === b.id ? "Adding..." : "Attach"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
  );
}

