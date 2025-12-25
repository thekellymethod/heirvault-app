"use client";

import { useState, useMemo } from "react";
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
  id: string,
  policyNumber: string,
  policyType: string,
  insurerName: string,
}

interface Beneficiary {
  id: string,
  firstName: string,
  lastName: string,
  relationship: string,
  email: string,
  phone: string,
  dateOfBirth: string,
}

interface CurrentData {
  client: {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    dateOfBirth: string,
    addressLine1: string,
    addressLine2: string,
    city: string,
    state: string,
    postalCode: string,
    country: string,
  };
  policies: Policy[];
  beneficiaries: Beneficiary[];
}

interface QRUpdateFormProps {
  token: string,
  clientId: string,
  currentData: CurrentData;
}

export function QRUpdateForm({ token, clientId, currentData }: QRUpdateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [policyDocuments, setPolicyDocuments] = useState<File[]>([]);

  // Form state - client demographics are read-only (prefilled from currentData)
  const [client, setClient] = useState(currentData.client);
  const [policies, setPolicies] = useState<Policy[]>(currentData.policies);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(currentData.beneficiaries);

  // Check if policies or beneficiaries have changed
  const hasPolicyChanges = useMemo(() => {
    if (policies.length !== currentData.policies.length) return true;
    return policies.some((policy, index) => {
      const current = currentData.policies[index];
      if (!current) return true;
      return (
        policy.policyNumber !== current.policyNumber ||
        policy.policyType !== current.policyType ||
        policy.insurerName !== current.insurerName
      );
    });
  }, [policies, currentData.policies]);

  const hasBeneficiaryChanges = useMemo(() => {
    if (beneficiaries.length !== currentData.beneficiaries.length) return true;
    return beneficiaries.some((beneficiary, index) => {
      const current = currentData.beneficiaries[index];
      if (!current) return true;
      return (
        beneficiary.firstName !== current.firstName ||
        beneficiary.lastName !== current.lastName ||
        beneficiary.relationship !== current.relationship ||
        beneficiary.email !== current.email ||
        beneficiary.phone !== current.phone ||
        beneficiary.dateOfBirth !== current.dateOfBirth
      );
    });
  }, [beneficiaries, currentData.beneficiaries]);

  const requiresDocumentUpload = hasPolicyChanges || hasBeneficiaryChanges;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate document upload requirement
      if (requiresDocumentUpload && policyDocuments.length === 0) {
        throw new Error(
          "Policy document upload is required when making changes to policies or beneficiaries. " +
          "Please upload the new policy document(s) that reflect your changes."
        );
      }

      // Create FormData to support file uploads
      const formData = new FormData();
      formData.append("clientId", clientId);
      formData.append("client", JSON.stringify(client));
      formData.append("policies", JSON.stringify(policies));
      formData.append("beneficiaries", JSON.stringify(beneficiaries));
      
      // Append policy documents
      policyDocuments.forEach((file, index) => {
        formData.append(`policyDocument_${index}`, file);
      });

      const res = await fetch(`/api/qr-update/${token}`, {
        method: "POST",
        body: formData, // Use FormData instead of JSON
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle validation errors with detailed messages
        if (data.details && Array.isArray(data.details)) {
          throw new Error(data.details.join("\n"));
        }
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

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPolicyDocuments([...policyDocuments, ...files]);
      setError(null);
    }
  };

  const removeDocument = (index: number) => {
    setPolicyDocuments(policyDocuments.filter((_, i) => i !== index));
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

      {/* Client Information - Prefilled and Read-Only */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-gold-500" />
          Client Information
        </h2>
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Your demographic information is prefilled from your registry record. 
            Email and phone number cannot be changed through this form. To update your email or phone number, 
            please contact customer service or your attorney.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="client-first-name" className="label">First Name <span className="text-red-500">*</span></label>
            <input
              id="client-first-name"
              className="input bg-slate-50 cursor-not-allowed"
              value={client.firstName}
              readOnly
              disabled
              aria-label="First Name (read-only)"
              title="First Name (read-only)"
            />
          </div>
          <div>
            <label htmlFor="client-last-name" className="label">Last Name <span className="text-red-500">*</span></label>
            <input
              id="client-last-name"
              className="input bg-slate-50 cursor-not-allowed"
              value={client.lastName}
              readOnly
              disabled
              aria-label="Last Name (read-only)"
              title="Last Name (read-only)"
            />
          </div>
          <div>
            <label htmlFor="client-email" className="label">Email <span className="text-red-500">*</span></label>
            <input
              id="client-email"
              type="email"
              className="input bg-slate-50 cursor-not-allowed"
              value={client.email}
              readOnly
              disabled
              aria-label="Email Address (read-only, cannot be changed)"
              title="Email Address (read-only, cannot be changed)"
            />
            <p className="text-xs text-slateui-500 mt-1">
              Cannot be changed. Contact customer service or your attorney to update.
            </p>
          </div>
          <div>
            <label htmlFor="client-phone" className="label">Phone</label>
            <input
              id="client-phone"
              type="tel"
              className="input bg-slate-50 cursor-not-allowed"
              value={client.phone}
              readOnly
              disabled
              aria-label="Phone Number (read-only, cannot be changed)"
              title="Phone Number (read-only, cannot be changed)"
            />
            <p className="text-xs text-slateui-500 mt-1">
              Cannot be changed. Contact customer service or your attorney to update.
            </p>
          </div>
          <div>
            <label htmlFor="client-date-of-birth" className="label">Date of Birth</label>
            <input
              id="client-date-of-birth"
              type="date"
              className="input bg-slate-50 cursor-not-allowed"
              value={client.dateOfBirth}
              readOnly
              disabled
              aria-label="Date of Birth (read-only)"
              title="Date of Birth (read-only)"
            />
          </div>
          <div>
            <label htmlFor="client-address-line1" className="label">Address Line 1</label>
            <input
              id="client-address-line1"
              className="input"
              value={client.addressLine1}
              onChange={(e) => setClient({ ...client, addressLine1: e.target.value })}
              aria-label="Address Line 1"
              placeholder="Street address"
            />
          </div>
          <div>
            <label htmlFor="client-address-line2" className="label">Address Line 2</label>
            <input
              id="client-address-line2"
              className="input"
              value={client.addressLine2}
              onChange={(e) => setClient({ ...client, addressLine2: e.target.value })}
              aria-label="Address Line 2"
              placeholder="Apartment, suite, etc."
            />
          </div>
          <div>
            <label htmlFor="client-city" className="label">City</label>
            <input
              id="client-city"
              className="input"
              value={client.city}
              onChange={(e) => setClient({ ...client, city: e.target.value })}
              aria-label="City"
              placeholder="City"
            />
          </div>
          <div>
            <label htmlFor="client-state" className="label">State</label>
            <input
              id="client-state"
              className="input"
              value={client.state}
              onChange={(e) => setClient({ ...client, state: e.target.value })}
              aria-label="State"
              placeholder="State"
            />
          </div>
          <div>
            <label htmlFor="client-postal-code" className="label">Postal Code</label>
            <input
              id="client-postal-code"
              className="input"
              value={client.postalCode}
              onChange={(e) => setClient({ ...client, postalCode: e.target.value })}
              aria-label="Postal Code"
              placeholder="ZIP or postal code"
            />
          </div>
          <div>
            <label htmlFor="client-country" className="label">Country</label>
            <input
              id="client-country"
              className="input"
              value={client.country}
              onChange={(e) => setClient({ ...client, country: e.target.value })}
              aria-label="Country"
              placeholder="Country"
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
                  <label htmlFor={`policy-number-${policy.id}`} className="label">Policy Number</label>
                  <input
                    id={`policy-number-${policy.id}`}
                    className="input"
                    value={policy.policyNumber}
                    onChange={(e) =>
                      setPolicies(
                        policies.map((p) =>
                          p.id === policy.id ? { ...p, policyNumber: e.target.value } : p
                        )
                      )
                    }
                    aria-label={`Policy Number for Policy ${index + 1}`}
                    placeholder="Policy number"
                  />
                </div>
                <div>
                  <label htmlFor={`policy-type-${policy.id}`} className="label">Policy Type</label>
                  <input
                    id={`policy-type-${policy.id}`}
                    className="input"
                    value={policy.policyType}
                    onChange={(e) =>
                      setPolicies(
                        policies.map((p) =>
                          p.id === policy.id ? { ...p, policyType: e.target.value } : p
                        )
                      )
                    }
                    aria-label={`Policy Type for Policy ${index + 1}`}
                    placeholder="Term, Whole Life, etc."
                  />
                </div>
                <div>
                  <label htmlFor={`insurer-name-${policy.id}`} className="label">
                    Insurance Company <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`insurer-name-${policy.id}`}
                    className="input"
                    required
                    value={policy.insurerName}
                    onChange={(e) =>
                      setPolicies(
                        policies.map((p) =>
                          p.id === policy.id ? { ...p, insurerName: e.target.value } : p
                        )
                      )
                    }
                    aria-label={`Insurance Company for Policy ${index + 1} (required)`}
                    placeholder="Required - Insurance company name"
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
                  <label htmlFor={`beneficiary-first-name-${beneficiary.id}`} className="label">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`beneficiary-first-name-${beneficiary.id}`}
                    className="input"
                    required
                    value={beneficiary.firstName}
                    onChange={(e) =>
                      setBeneficiaries(
                        beneficiaries.map((b) =>
                          b.id === beneficiary.id ? { ...b, firstName: e.target.value } : b
                        )
                      )
                    }
                    aria-label={`First Name for Beneficiary ${index + 1} (required)`}
                    placeholder="Required"
                  />
                </div>
                <div>
                  <label htmlFor={`beneficiary-last-name-${beneficiary.id}`} className="label">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`beneficiary-last-name-${beneficiary.id}`}
                    className="input"
                    required
                    value={beneficiary.lastName}
                    onChange={(e) =>
                      setBeneficiaries(
                        beneficiaries.map((b) =>
                          b.id === beneficiary.id ? { ...b, lastName: e.target.value } : b
                        )
                      )
                    }
                    aria-label={`Last Name for Beneficiary ${index + 1} (required)`}
                    placeholder="Required"
                  />
                </div>
                <div>
                  <label htmlFor={`beneficiary-relationship-${beneficiary.id}`} className="label">Relationship</label>
                  <input
                    id={`beneficiary-relationship-${beneficiary.id}`}
                    className="input"
                    value={beneficiary.relationship}
                    onChange={(e) =>
                      setBeneficiaries(
                        beneficiaries.map((b) =>
                          b.id === beneficiary.id ? { ...b, relationship: e.target.value } : b
                        )
                      )
                    }
                    aria-label={`Relationship for Beneficiary ${index + 1}`}
                    placeholder="Spouse, Child, etc."
                  />
                </div>
                <div>
                  <label htmlFor={`beneficiary-email-${beneficiary.id}`} className="label">Email</label>
                  <input
                    id={`beneficiary-email-${beneficiary.id}`}
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
                    aria-label={`Email for Beneficiary ${index + 1}`}
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label htmlFor={`beneficiary-phone-${beneficiary.id}`} className="label">Phone</label>
                  <input
                    id={`beneficiary-phone-${beneficiary.id}`}
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
                    aria-label={`Phone for Beneficiary ${index + 1}`}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label htmlFor={`beneficiary-date-of-birth-${beneficiary.id}`} className="label">Date of Birth</label>
                  <input
                    id={`beneficiary-date-of-birth-${beneficiary.id}`}
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
                    aria-label={`Date of Birth for Beneficiary ${index + 1}`}
                    title={`Date of Birth for Beneficiary ${index + 1}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Policy Document Upload - Required when changes are made */}
      {requiresDocumentUpload && (
        <div className="card p-6 bg-orange-50 border-orange-200">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-ink-900 mb-1">Policy Document Upload Required</h3>
              <p className="text-sm text-slateui-600">
                Since you have made changes to your policies or beneficiaries, you must upload 
                the new policy document(s) that reflect these changes. This ensures the registry 
                has the most current documentation.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <label htmlFor="policy-document-upload" className="block">
              <span className="label mb-1 block">
                Upload Policy Document(s) <span className="text-red-500">*</span>
              </span>
              <input
                id="policy-document-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleDocumentUpload}
                className="input"
                aria-label="Upload Policy Document(s)"
                title="Upload Policy Document(s)"
              />
              <p className="text-xs text-slateui-500 mt-1">
                Accepted formats: PDF, JPG, PNG (max 10MB per file)
              </p>
            </label>
            {policyDocuments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-ink-900">Uploaded Documents:</p>
                {policyDocuments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white border border-slateui-200 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gold-500" />
                      <span className="text-sm text-ink-900">{file.name}</span>
                      <span className="text-xs text-slateui-500">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                      aria-label={`Remove ${file.name}`}
                      title={`Remove ${file.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
          disabled={loading || (requiresDocumentUpload && policyDocuments.length === 0)}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        {requiresDocumentUpload && policyDocuments.length === 0 && (
          <p className="text-sm text-red-600 mt-2 text-center">
            Please upload policy document(s) before submitting.
          </p>
        )}
      </div>
    </form>
  );
}

