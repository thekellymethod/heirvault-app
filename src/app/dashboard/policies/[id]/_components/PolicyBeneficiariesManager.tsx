"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type BeneficiaryDTO = {
  id: string,
  firstName: string,
  lastName: string,
  relationship: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
};

export default function policy_beneficiariesManager({
  policyId,
  clientId,
}: {
  policyId: string,
  clientId: string,
}) {
  const [loading, setLoading] = React.useState(true);
  const [attached, setAttached] = React.useState<BeneficiaryDTO[]>([]);
  const [available, setAvailable] = React.useState<BeneficiaryDTO[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  // create form
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [relationship, setRelationship] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/policies/${policyId}/beneficiaries`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load beneficiaries");

      setAttached(data.attached || []);
      setAvailable(data.available || []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyId]);

  async function attach(beneficiaryId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/policies/${policyId}/beneficiaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beneficiaryId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Attach failed");
      await refresh();
    } catch (e: unknown) {
  const message = e instanceof Error ? e.message : "Unknown error";
} {
      setError(e?.message || "Attach failed");
    }
  }

  async function detach(beneficiaryId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/policies/${policyId}/beneficiaries`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beneficiaryId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Detach failed");
      await refresh();
    } catch (e: unknown) {
  const message = e instanceof Error ? e.message : "Unknown error";
} {
      setError(e?.message || "Detach failed");
    }
  }

  async function createAndAttach() {
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    try {
      // 1) create beneficiary under client
      const resCreate = await fetch(`/api/beneficiaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          relationship: relationship.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
        }),
      });

      const created = await resCreate.json();
      if (!resCreate.ok) throw new Error(created?.error || "Create beneficiary failed");
      const beneficiaryId = created?.id as string | undefined;
      if (!beneficiaryId) throw new Error("Create succeeded but no beneficiary id returned");

      // 2) attach to policy
      await attach(beneficiaryId);

      // 3) clear form
      setFirstName("");
      setLastName("");
      setRelationship("");
      setEmail("");
      setPhone("");
    } catch (e: unknown) {
  const message = e instanceof Error ? e.message : "Unknown error";
} {
      setError(e?.message || "Create failed");
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-100">Beneficiaries</div>
          <div className="mt-1 text-xs text-slate-500">
            Attach existing beneficiaries or create a new one for this policy.
          </div>
        </div>

        <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {/* Attached */}
        <div>
          <div className="text-xs font-semibold text-slate-400">Attached to this policy</div>

          {loading ? (
            <div className="mt-3 text-sm text-slate-400">Loading…</div>
          ) : attached.length === 0 ? (
            <div className="mt-3 text-sm text-slate-400">No beneficiaries attached yet.</div>
          ) : (
            <div className="mt-3 space-y-3">
              {attached.map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/30 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-100">
                        {b.firstName} {b.lastName}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {b.relationship || "—"}{" "}
                        {b.email ? `· ${b.email}` : ""} {b.phone ? `· ${b.phone}` : ""}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => detach(b.id)}
                      disabled={loading}
                    >
                      Detach
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available + Create */}
        <div className="space-y-6">
          <div>
            <div className="text-xs font-semibold text-slate-400">Available to attach</div>
            {loading ? (
              <div className="mt-3 text-sm text-slate-400">Loading…</div>
            ) : available.length === 0 ? (
              <div className="mt-3 text-sm text-slate-400">
                No additional beneficiaries available for this client.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {available.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-100">
                          {b.firstName} {b.lastName}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {b.relationship || "—"}{" "}
                          {b.email ? `· ${b.email}` : ""} {b.phone ? `· ${b.phone}` : ""}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => attach(b.id)} disabled={loading}>
                        Attach
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-xs font-semibold text-slate-400">Create new beneficiary</div>

            <div className="mt-3 grid gap-3">
              <input
                className="h-10 rounded-md border border-slate-800 bg-slate-950/40 px-3 text-sm text-slate-100"
                placeholder="First name *"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                className="h-10 rounded-md border border-slate-800 bg-slate-950/40 px-3 text-sm text-slate-100"
                placeholder="Last name *"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              <input
                className="h-10 rounded-md border border-slate-800 bg-slate-950/40 px-3 text-sm text-slate-100"
                placeholder="Relationship (spouse, child, trust…) "
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              />
              <input
                className="h-10 rounded-md border border-slate-800 bg-slate-950/40 px-3 text-sm text-slate-100"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="h-10 rounded-md border border-slate-800 bg-slate-950/40 px-3 text-sm text-slate-100"
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <Button onClick={createAndAttach} disabled={loading}>
                Create & attach
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
