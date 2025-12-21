"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  FileText,
  UserCheck,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

interface Policy {
  id: string;
  policyNumber: string;
  policyType: string;
  insurerName: string;
}

interface Beneficiary {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

interface CurrentData {
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  policies: Policy[];
  beneficiaries: Beneficiary[];
}

interface QRUpdateFormProps {
  token: string;
  clientId: string;
  currentData: CurrentData;
}

export function QRUpdateForm({ token, clientId, currentData }: QRUpdateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [client, setClient] = useState(currentData.client);
  const [policies, setPolicies] = useState<Policy[]>(currentData.policies);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(currentData.beneficiaries);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/qr-update/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          client,
          policies,
          beneficiaries,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit update");
      }

      setSuccess(true);
      
      // Redirect to success page after a moment
      setTimeout(() => {
        router.push(`/qr-update/${token}/success`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const addPolicy = () => {
    setPolicies([
      ...policies,
      {
        id: `new-${Date.now()}`,
        policyNumber: "",
        policyType: "",
        insurerName: "",
      },
    ]);
  };

  const removePolicy = (id: string) => {
    setPolicies(policies.filter((p) => p.id !== id));
  };

  const addBeneficiary = () => {
    setBeneficiaries([
      ...beneficiaries,
      {
        id: `new-${Date.now()}`,
        firstName: "",
        lastName: "",
        relationship: "",
        email: "",
        phone: "",
        dateOfBirth: "",
      },
    ]);
  };

  const removeBeneficiary = (id: string) => {
    setBeneficiaries(beneficiaries.filter((b) => b.id !== id));
  };

  if (success) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="font-display text-xl font-bold text-ink-900 mb-2">Update Submitted Successfully</h2>
        <p className="text-sm text-slateui-600 mb-4">
          Your update has been recorded as a new version. You will receive a confirmation email shortly.
        </p>
        <p className="text-xs text-slateui-500">
          Redirecting...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Client Information */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-gold-500" />
          Client Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">First Name <span className="text-red-500">*</span></label>
            <input
              className="input"
              value={client.firstName}
              onChange={(e) => setClient({ ...client, firstName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Last Name <span className="text-red-500">*</span></label>
            <input
              className="input"
              value={client.lastName}
              onChange={(e) => setClient({ ...client, lastName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              className="input"
              value={client.email}
              onChange={(e) => setClient({ ...client, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              className="input"
              value={client.phone}
              onChange={(e) => setClient({ ...client, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input
              type="date"
              className="input"
              value={client.dateOfBirth}
              onChange={(e) => setClient({ ...client, dateOfBirth: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Address Line 1</label>
            <input
              className="input"
              value={client.addressLine1}
              onChange={(e) => setClient({ ...client, addressLine1: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Address Line 2</label>
            <input
              className="input"
              value={client.addressLine2}
              onChange={(e) => setClient({ ...client, addressLine2: e.target.value })}
            />
          </div>
          <div>
            <label className="label">City</label>
            <input
              className="input"
              value={client.city}
              onChange={(e) => setClient({ ...client, city: e.target.value })}
            />
          </div>
          <div>
            <label className="label">State</label>
            <input
              className="input"
              value={client.state}
              onChange={(e) => setClient({ ...client, state: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Postal Code</label>
            <input
              className="input"
              value={client.postalCode}
              onChange={(e) => setClient({ ...client, postalCode: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Country</label>
            <input
              className="input"
              value={client.country}
              onChange={(e) => setClient({ ...client, country: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Policies */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-ink-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gold-500" />
            Policies ({policies.length})
          </h2>
          <button
            type="button"
            onClick={addPolicy}
            className="btn-secondary px-3 py-1.5 text-sm flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Policy
          </button>
        </div>
        <div className="space-y-4">
          {policies.map((policy, index) => (
            <div key={policy.id} className="border border-slateui-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slateui-700">Policy {index + 1}</span>
                {policies.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePolicy(policy.id)}
                    className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Policy Number</label>
                  <input
                    className="input"
                    value={policy.policyNumber}
                    onChange={(e) =>
                      setPolicies(
                        policies.map((p) =>
                          p.id === policy.id ? { ...p, policyNumber: e.target.value } : p
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <label className="label">Policy Type</label>
                  <input
                    className="input"
                    value={policy.policyType}
                    onChange={(e) =>
                      setPolicies(
                        policies.map((p) =>
                          p.id === policy.id ? { ...p, policyType: e.target.value } : p
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <label className="label">Insurer Name</label>
                  <input
                    className="input"
                    value={policy.insurerName}
                    onChange={(e) =>
                      setPolicies(
                        policies.map((p) =>
                          p.id === policy.id ? { ...p, insurerName: e.target.value } : p
                        )
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Beneficiaries */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-ink-900 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-gold-500" />
            Beneficiaries ({beneficiaries.length})
          </h2>
          <button
            type="button"
            onClick={addBeneficiary}
            className="btn-secondary px-3 py-1.5 text-sm flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Beneficiary
          </button>
        </div>
        <div className="space-y-4">
          {beneficiaries.map((beneficiary, index) => (
            <div key={beneficiary.id} className="border border-slateui-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slateui-700">Beneficiary {index + 1}</span>
                {beneficiaries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBeneficiary(beneficiary.id)}
                    className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input
                    className="input"
                    value={beneficiary.firstName}
                    onChange={(e) =>
                      setBeneficiaries(
                        beneficiaries.map((b) =>
                          b.id === beneficiary.id ? { ...b, firstName: e.target.value } : b
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    className="input"
                    value={beneficiary.lastName}
                    onChange={(e) =>
                      setBeneficiaries(
                        beneficiaries.map((b) =>
                          b.id === beneficiary.id ? { ...b, lastName: e.target.value } : b
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <label className="label">Relationship</label>
                  <input
                    className="input"
                    value={beneficiary.relationship}
                    onChange={(e) =>
                      setBeneficiaries(
                        beneficiaries.map((b) =>
                          b.id === beneficiary.id ? { ...b, relationship: e.target.value } : b
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={beneficiary.email}
                    onChange={(e) =>
                      setBeneficiaries(
                        beneficiaries.map((b) =>
                          b.id === beneficiary.id ? { ...b, email: e.target.value } : b
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    className="input"
                    value={beneficiary.phone}
                    onChange={(e) =>
                      setBeneficiaries(
                        beneficiaries.map((b) =>
                          b.id === beneficiary.id ? { ...b, phone: e.target.value } : b
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input
                    type="date"
                    className="input"
                    value={beneficiary.dateOfBirth}
                    onChange={(e) =>
                      setBeneficiaries(
                        beneficiaries.map((b) =>
                          b.id === beneficiary.id ? { ...b, dateOfBirth: e.target.value } : b
                        )
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="card p-6 bg-gold-50 border-gold-200">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-gold-600" />
          <div>
            <h3 className="font-semibold text-ink-900">Version History Preserved</h3>
            <p className="text-sm text-slateui-600">
              This update will create a new version entry. Your previous information will remain
              accessible for reference and legal purposes.
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Submitting Update...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Submit Update
            </>
          )}
        </button>
      </div>
    </form>
  );
}

