"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus, Users } from "lucide-react";
import { ListSkeleton } from "@/components/ui/skeleton";
import { EmptyListState } from "@/components/ui/empty-state";

type Beneficiary = {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  createdAt?: string;
};

export default function ClientBeneficiariesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [items, setItems] = React.useState<Beneficiary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [relationship, setRelationship] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/beneficiaries`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load beneficiaries");
      setItems(data.beneficiaries || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, [clientId]);

  async function createBeneficiary() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/beneficiaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          relationship: relationship.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          dateOfBirth: dateOfBirth || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create beneficiary");

      setOpen(false);
      setFirstName("");
      setLastName("");
      setRelationship("");
      setEmail("");
      setPhone("");
      setDateOfBirth("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/clients/${clientId}`)}
              className="btn-secondary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900">Beneficiaries</h1>
              <p className="mt-2 text-base text-slateui-600">Create and manage beneficiaries for this client.</p>
            </div>
          </div>
          <Button onClick={() => setOpen(!open)} className="btn-primary">
            <UserPlus className="h-4 w-4 mr-2" />
            {open ? "Close" : "New Beneficiary"}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Create Form */}
        {open && (
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold text-ink-900 mb-6">Add New Beneficiary</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <label className="label mb-1 block">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
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
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="input"
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="label mb-1 block">
                  Relationship <span className="text-red-500">*</span>
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  required
                  className="input"
                >
                  <option value="">Select relationship</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Grandchild">Grandchild</option>
                  <option value="Other Relative">Other Relative</option>
                  <option value="Friend">Friend</option>
                  <option value="Business Partner">Business Partner</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="label mb-1 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="label mb-1 block">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="label mb-1 block">Date of Birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="input"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setFirstName("");
                  setLastName("");
                  setRelationship("");
                  setEmail("");
                  setPhone("");
                  setDateOfBirth("");
                  setError(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </Button>
              <Button
                disabled={!firstName.trim() || !lastName.trim() || !relationship.trim() || saving}
                onClick={createBeneficiary}
                className="btn-primary"
              >
                {saving ? "Creating..." : "Create Beneficiary"}
              </Button>
            </div>
          </div>
        )}

        {/* Beneficiaries List */}
        <div className="card overflow-hidden p-0">
          <div className="border-b border-slateui-200 px-6 py-4 flex items-center gap-2 bg-paper-50">
            <Users className="h-5 w-5 text-gold-500" />
            <div className="text-sm font-semibold text-ink-900">
              {loading ? "Loading..." : `${items.length} Beneficiary${items.length !== 1 ? "ies" : ""}`}
            </div>
          </div>
          {loading ? (
            <div className="p-8">
              <ListSkeleton count={3} />
            </div>
          ) : items.length === 0 ? (
            <EmptyListState
              icon="Users"
              title="No beneficiaries yet"
              description="Add beneficiaries to track who will receive benefits from your client's life insurance policies."
              action={{
                label: "New Beneficiary",
                href: `/dashboard/clients/${clientId}/beneficiaries/new`,
              }}
            />
          ) : (
            <div className="divide-y divide-slateui-200">
              {items.map((b) => (
                <div key={b.id} className="p-5 hover:bg-paper-100 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base font-semibold text-ink-900">
                          {b.firstName} {b.lastName}
                        </h3>
                        {b.relationship && (
                          <span className="text-xs text-slateui-600 bg-paper-100 px-2 py-0.5 rounded">
                            {b.relationship}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slateui-600">
                        {b.email && (
                          <>
                            <span>{b.email}</span>
                            <span className="text-slateui-300">•</span>
                          </>
                        )}
                        {b.phone && (
                          <>
                            <span>{b.phone}</span>
                            <span className="text-slateui-300">•</span>
                          </>
                        )}
                        {b.dateOfBirth && (
                          <span>DOB: {b.dateOfBirth.slice(0, 10)}</span>
                        )}
                        {!b.email && !b.phone && !b.dateOfBirth && (
                          <span className="text-slateui-400 italic">No additional information</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}
