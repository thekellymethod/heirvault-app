"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Mail, Phone, CheckCircle, AlertCircle, Save } from "lucide-react";

interface Policy {
  id?: string;
  policyNumber: string;
  insurerName: string;
  policyType: string;
}

interface Beneficiary {
  id?: string;
  firstName: string;
  lastName: string;
  relationship: string;
  percentage: number;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export default function UpdatePolicyPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [confirmationMethod, setConfirmationMethod] = useState<"email" | "phone" | null>(null);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [clientData, setClientData] = useState<any>(null);

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [address, setAddress] = useState<Address>({
    street: "",
    city: "",
    state: "",
    zipCode: "",
  });

  useEffect(() => {
    if (token) {
      loadClientData();
    }
  }, [token]);

  const loadClientData = async () => {
    try {
      const res = await fetch(`/api/invite/${token}/client-data`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load data");
      
      setClientData(data);
      setPolicies(data.policies || []);
      setBeneficiaries(data.beneficiaries || []);
      if (data.address) {
        setAddress(data.address);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPolicy = () => {
    setPolicies([...policies, { policyNumber: "", insurerName: "", policyType: "" }]);
  };

  const handleRemovePolicy = (index: number) => {
    setPolicies(policies.filter((_, i) => i !== index));
  };

  const handleAddBeneficiary = () => {
    setBeneficiaries([...beneficiaries, { firstName: "", lastName: "", relationship: "", percentage: 0 }]);
  };

  const handleRemoveBeneficiary = (index: number) => {
    setBeneficiaries(beneficiaries.filter((_, i) => i !== index));
  };

  const handleSendConfirmation = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/invite/${token}/send-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: confirmationMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send confirmation");
      setConfirmationSent(true);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Verify confirmation code first
      if (!confirmationCode) {
        throw new Error("Please enter the confirmation code sent to your email or phone");
      }

      const verifyRes = await fetch(`/api/invite/${token}/verify-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: confirmationCode, method: confirmationMethod }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Invalid confirmation code");

      // Submit updates
      const res = await fetch(`/api/invite/${token}/update-client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policies,
          beneficiaries,
          address,
          confirmationCode,
          confirmationMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save updates");

      // Redirect to receipt page with receipt data
      if (data.receiptId && data.receiptData) {
        // Store receipt data temporarily
        sessionStorage.setItem(`receipt_${data.receiptId}`, JSON.stringify(data.receiptData));
        router.push(`/update-policy/${token}/receipt?receiptId=${data.receiptId}&token=${token}`);
      } else {
        setSuccess(true);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600 mx-auto mb-4"></div>
          <p className="text-slateui-600">Loading your information...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-paper-50 flex items-center justify-center">
        <div className="card p-8 max-w-md text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="font-display text-2xl font-semibold text-ink-900 mb-2">
            Updates Saved Successfully
          </h2>
          <p className="text-slateui-600">
            Your changes have been confirmed and saved. You will receive an updated receipt via email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-50">
      <header className="sticky top-0 z-50 border-b border-slateui-200 bg-paper-50/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <Logo size="sm" showTagline={false} className="flex-row" href="/" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 sm:py-12 overflow-x-hidden">
        <div className="mb-8">
          <h1 className="font-display text-3xl text-ink-900 mb-2">Update Your Information</h1>
          <p className="text-slateui-600">
            Make changes to your policies, beneficiaries, or address. All changes require confirmation.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 overflow-y-auto">
          {/* Policies Section */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-ink-900">Policies</h2>
              <Button
                type="button"
                onClick={handleAddPolicy}
                className="btn-secondary text-sm"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Policy
              </Button>
            </div>
            <div className="space-y-4">
              {policies.map((policy, index) => (
                <div key={index} className="border border-slateui-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-ink-900">Policy {index + 1}</h3>
                    <Button
                      type="button"
                      onClick={() => handleRemovePolicy(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="label mb-1 block text-sm">Policy Number</label>
                      <Input
                        value={policy.policyNumber}
                        onChange={(e) => {
                          const updated = [...policies];
                          updated[index].policyNumber = e.target.value;
                          setPolicies(updated);
                        }}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label mb-1 block text-sm">Insurer Name</label>
                      <Input
                        value={policy.insurerName}
                        onChange={(e) => {
                          const updated = [...policies];
                          updated[index].insurerName = e.target.value;
                          setPolicies(updated);
                        }}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label mb-1 block text-sm">Policy Type</label>
                      <Input
                        value={policy.policyType}
                        onChange={(e) => {
                          const updated = [...policies];
                          updated[index].policyType = e.target.value;
                          setPolicies(updated);
                        }}
                        className="input"
                        placeholder="Term, Whole Life, etc."
                      />
                    </div>
                  </div>
                </div>
              ))}
              {policies.length === 0 && (
                <p className="text-sm text-slateui-500 text-center py-4">
                  No policies added. Click "Add Policy" to add one.
                </p>
              )}
            </div>
          </div>

          {/* Beneficiaries Section */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-ink-900">Beneficiaries</h2>
              <Button
                type="button"
                onClick={handleAddBeneficiary}
                className="btn-secondary text-sm"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Beneficiary
              </Button>
            </div>
            <div className="space-y-4">
              {beneficiaries.map((beneficiary, index) => (
                <div key={index} className="border border-slateui-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-ink-900">Beneficiary {index + 1}</h3>
                    <Button
                      type="button"
                      onClick={() => handleRemoveBeneficiary(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <label className="label mb-1 block text-sm">First Name</label>
                      <Input
                        value={beneficiary.firstName}
                        onChange={(e) => {
                          const updated = [...beneficiaries];
                          updated[index].firstName = e.target.value;
                          setBeneficiaries(updated);
                        }}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label mb-1 block text-sm">Last Name</label>
                      <Input
                        value={beneficiary.lastName}
                        onChange={(e) => {
                          const updated = [...beneficiaries];
                          updated[index].lastName = e.target.value;
                          setBeneficiaries(updated);
                        }}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label mb-1 block text-sm">Relationship</label>
                      <Input
                        value={beneficiary.relationship}
                        onChange={(e) => {
                          const updated = [...beneficiaries];
                          updated[index].relationship = e.target.value;
                          setBeneficiaries(updated);
                        }}
                        className="input"
                        placeholder="Spouse, Child, etc."
                      />
                    </div>
                    <div>
                      <label className="label mb-1 block text-sm">Percentage</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={beneficiary.percentage}
                        onChange={(e) => {
                          const updated = [...beneficiaries];
                          updated[index].percentage = parseInt(e.target.value) || 0;
                          setBeneficiaries(updated);
                        }}
                        className="input"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {beneficiaries.length === 0 && (
                <p className="text-sm text-slateui-500 text-center py-4">
                  No beneficiaries added. Click "Add Beneficiary" to add one.
                </p>
              )}
            </div>
          </div>

          {/* Address Section */}
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold text-ink-900 mb-4">Address</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label mb-1 block text-sm">Street Address</label>
                <Input
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label mb-1 block text-sm">City</label>
                <Input
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label mb-1 block text-sm">State</label>
                <Input
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label mb-1 block text-sm">ZIP Code</label>
                <Input
                  value={address.zipCode}
                  onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Confirmation Section */}
          <div className="card p-6 bg-gold-50 border-gold-200">
            <h2 className="font-display text-xl font-semibold text-ink-900 mb-4">
              Confirm Changes
            </h2>
            <p className="text-sm text-slateui-600 mb-4">
              For security, we need to verify your identity. Choose how you'd like to receive your confirmation code:
            </p>

            {!confirmationSent ? (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setConfirmationMethod("email");
                      handleSendConfirmation();
                    }}
                    className="btn-secondary flex-1"
                    disabled={!clientData?.email}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email ({clientData?.email || "Not available"})
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setConfirmationMethod("phone");
                      handleSendConfirmation();
                    }}
                    className="btn-secondary flex-1"
                    disabled={!clientData?.phone}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Phone ({clientData?.phone || "Not available"})
                  </Button>
                </div>
                {(!clientData?.email && !clientData?.phone) && (
                  <p className="text-sm text-red-600">
                    No email or phone on file. Please contact customer service or your attorney to update your contact information.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slateui-600">
                  Confirmation code sent to your {confirmationMethod === "email" ? "email" : "phone"}.
                  Please enter it below:
                </p>
                <Input
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  placeholder="Enter confirmation code"
                  className="input max-w-xs"
                  required
                />
                <Button
                  type="button"
                  onClick={handleSendConfirmation}
                  variant="ghost"
                  size="sm"
                  className="text-sm"
                >
                  Resend code
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              onClick={() => router.push("/")}
              className="btn-secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !confirmationCode}
              className="btn-primary flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

