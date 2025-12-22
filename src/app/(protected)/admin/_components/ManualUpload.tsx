"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Users, UserCheck, AlertCircle, CheckCircle } from "lucide-react";

type UploadType = "attorney" | "client" | "beneficiary";

export function ManualUpload() {
  const [uploadType, setUploadType] = useState<UploadType>("attorney");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Attorney form fields
  const [attorneyData, setAttorneyData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    lawFirm: "",
    barNumber: "",
    licenseState: "",
  });

  // Client form fields
  const [clientData, setClientData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });

  // Beneficiary form fields
  const [beneficiaryData, setBeneficiaryData] = useState({
    clientId: "",
    firstName: "",
    lastName: "",
    relationship: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let data;
      if (uploadType === "attorney") {
        data = attorneyData;
      } else if (uploadType === "client") {
        data = clientData;
      } else {
        data = beneficiaryData;
      }

      const res = await fetch("/api/admin/manual-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: uploadType, data }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to create record");
      }

      setSuccess(result.message || "Record created successfully");
      
      // Reset form
      if (uploadType === "attorney") {
        setAttorneyData({
          email: "",
          firstName: "",
          lastName: "",
          phone: "",
          lawFirm: "",
          barNumber: "",
          licenseState: "",
        });
      } else if (uploadType === "client") {
        setClientData({
          email: "",
          firstName: "",
          lastName: "",
          phone: "",
          dateOfBirth: "",
          addressLine1: "",
          addressLine2: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        });
      } else {
        setBeneficiaryData({
          clientId: "",
          firstName: "",
          lastName: "",
          relationship: "",
          email: "",
          phone: "",
          dateOfBirth: "",
          addressLine1: "",
          addressLine2: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Type Selector */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-ink-900 mb-4">Select Record Type</h2>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => {
              setUploadType("attorney");
              setError(null);
              setSuccess(null);
            }}
            className={`p-4 border-2 rounded-lg transition ${
              uploadType === "attorney"
                ? "border-gold-500 bg-gold-50"
                : "border-slateui-200 hover:border-slateui-300"
            }`}
          >
            <UserPlus className="h-8 w-8 mx-auto mb-2 text-gold-600" />
            <div className="font-medium text-ink-900">Attorney</div>
            <div className="text-xs text-slateui-600 mt-1">Add new attorney</div>
          </button>
          <button
            onClick={() => {
              setUploadType("client");
              setError(null);
              setSuccess(null);
            }}
            className={`p-4 border-2 rounded-lg transition ${
              uploadType === "client"
                ? "border-gold-500 bg-gold-50"
                : "border-slateui-200 hover:border-slateui-300"
            }`}
          >
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="font-medium text-ink-900">Client</div>
            <div className="text-xs text-slateui-600 mt-1">Add policy holder</div>
          </button>
          <button
            onClick={() => {
              setUploadType("beneficiary");
              setError(null);
              setSuccess(null);
            }}
            className={`p-4 border-2 rounded-lg transition ${
              uploadType === "beneficiary"
                ? "border-gold-500 bg-gold-50"
                : "border-slateui-200 hover:border-slateui-300"
            }`}
          >
            <UserCheck className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="font-medium text-ink-900">Beneficiary</div>
            <div className="text-xs text-slateui-600 mt-1">Add beneficiary</div>
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="card p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="card p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm">{success}</span>
          </div>
        </div>
      )}

      {/* Attorney Form */}
      {uploadType === "attorney" && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-ink-900 mb-4">Attorney Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={attorneyData.email}
                onChange={(e) => setAttorneyData({ ...attorneyData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                Phone
              </label>
              <Input
                type="tel"
                value={attorneyData.phone}
                onChange={(e) => setAttorneyData({ ...attorneyData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={attorneyData.firstName}
                onChange={(e) => setAttorneyData({ ...attorneyData, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={attorneyData.lastName}
                onChange={(e) => setAttorneyData({ ...attorneyData, lastName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                Law Firm
              </label>
              <Input
                value={attorneyData.lawFirm}
                onChange={(e) => setAttorneyData({ ...attorneyData, lawFirm: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                Bar Number <span className="text-red-500">*</span>
              </label>
              <Input
                value={attorneyData.barNumber}
                onChange={(e) => setAttorneyData({ ...attorneyData, barNumber: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                License State <span className="text-red-500">*</span>
              </label>
              <Input
                value={attorneyData.licenseState}
                onChange={(e) => setAttorneyData({ ...attorneyData, licenseState: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Creating..." : "Create Attorney"}
            </Button>
          </div>
        </form>
      )}

      {/* Client Form */}
      {uploadType === "client" && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-ink-900 mb-4">Client (Policy Holder) Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={clientData.email}
                onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                Phone
              </label>
              <Input
                type="tel"
                value={clientData.phone}
                onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={clientData.firstName}
                onChange={(e) => setClientData({ ...clientData, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={clientData.lastName}
                onChange={(e) => setClientData({ ...clientData, lastName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                Date of Birth
              </label>
              <Input
                type="date"
                value={clientData.dateOfBirth}
                onChange={(e) => setClientData({ ...clientData, dateOfBirth: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-ink-900 mb-4">Address (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-ink-900 mb-1">Address Line 1</label>
                <Input
                  value={clientData.addressLine1}
                  onChange={(e) => setClientData({ ...clientData, addressLine1: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-ink-900 mb-1">Address Line 2</label>
                <Input
                  value={clientData.addressLine2}
                  onChange={(e) => setClientData({ ...clientData, addressLine2: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">City</label>
                <Input
                  value={clientData.city}
                  onChange={(e) => setClientData({ ...clientData, city: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">State</label>
                <Input
                  value={clientData.state}
                  onChange={(e) => setClientData({ ...clientData, state: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">Postal Code</label>
                <Input
                  value={clientData.postalCode}
                  onChange={(e) => setClientData({ ...clientData, postalCode: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">Country</label>
                <Input
                  value={clientData.country}
                  onChange={(e) => setClientData({ ...clientData, country: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Creating..." : "Create Client"}
            </Button>
          </div>
        </form>
      )}

      {/* Beneficiary Form */}
      {uploadType === "beneficiary" && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-ink-900 mb-4">Beneficiary Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-ink-900 mb-1">
                Client ID <span className="text-red-500">*</span>
              </label>
              <Input
                value={beneficiaryData.clientId}
                onChange={(e) => setBeneficiaryData({ ...beneficiaryData, clientId: e.target.value })}
                placeholder="Enter the client ID this beneficiary belongs to"
                required
              />
              <p className="text-xs text-slateui-600 mt-1">
                The UUID of the client (policy holder) this beneficiary is associated with
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={beneficiaryData.firstName}
                onChange={(e) => setBeneficiaryData({ ...beneficiaryData, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={beneficiaryData.lastName}
                onChange={(e) => setBeneficiaryData({ ...beneficiaryData, lastName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                Relationship
              </label>
              <Input
                value={beneficiaryData.relationship}
                onChange={(e) => setBeneficiaryData({ ...beneficiaryData, relationship: e.target.value })}
                placeholder="e.g., Spouse, Child, Parent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={beneficiaryData.email}
                onChange={(e) => setBeneficiaryData({ ...beneficiaryData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                Phone
              </label>
              <Input
                type="tel"
                value={beneficiaryData.phone}
                onChange={(e) => setBeneficiaryData({ ...beneficiaryData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-900 mb-1">
                Date of Birth
              </label>
              <Input
                type="date"
                value={beneficiaryData.dateOfBirth}
                onChange={(e) => setBeneficiaryData({ ...beneficiaryData, dateOfBirth: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-ink-900 mb-4">Address (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-ink-900 mb-1">Address Line 1</label>
                <Input
                  value={beneficiaryData.addressLine1}
                  onChange={(e) => setBeneficiaryData({ ...beneficiaryData, addressLine1: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-ink-900 mb-1">Address Line 2</label>
                <Input
                  value={beneficiaryData.addressLine2}
                  onChange={(e) => setBeneficiaryData({ ...beneficiaryData, addressLine2: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">City</label>
                <Input
                  value={beneficiaryData.city}
                  onChange={(e) => setBeneficiaryData({ ...beneficiaryData, city: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">State</label>
                <Input
                  value={beneficiaryData.state}
                  onChange={(e) => setBeneficiaryData({ ...beneficiaryData, state: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">Postal Code</label>
                <Input
                  value={beneficiaryData.postalCode}
                  onChange={(e) => setBeneficiaryData({ ...beneficiaryData, postalCode: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">Country</label>
                <Input
                  value={beneficiaryData.country}
                  onChange={(e) => setBeneficiaryData({ ...beneficiaryData, country: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Creating..." : "Create Beneficiary"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

