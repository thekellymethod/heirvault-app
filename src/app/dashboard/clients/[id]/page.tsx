"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "../../_components/DashboardLayout";
import { 
  FileText, 
  Users, 
  Download, 
  Mail, 
  FileCheck, 
  Calendar,
  Phone,
  Mail as MailIcon,
  ArrowLeft,
  ExternalLink,
  Shield
} from "lucide-react";
import { InviteClientButton } from "./_components/InviteClientButton";

type Policy = {
  id: string;
  policyNumber: string | null;
  policyType: string | null;
  insurer?: { id: string; name: string; website: string | null } | null;
  beneficiaries: Array<{
    beneficiary: {
      id: string;
      firstName: string;
      lastName: string;
      relationship: string | null;
      email: string | null;
      phone: string | null;
    };
  }>;
  createdAt: string;
};

type Beneficiary = {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
};

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  policies: Policy[];
  beneficiaries: Beneficiary[];
  deathCertificateUrl?: string | null;
  deathCertificateNumber?: string | null;
  dateOfDeath?: string | null;
  attorneyAccess?: Array<{
    attorney: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
    grantedAt: string;
  }>;
};

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [client, setClient] = React.useState<Client | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = React.useState(false);
  const [emailingPDF, setEmailingPDF] = React.useState(false);
  const [emailAddress, setEmailAddress] = React.useState("");
  const [showEmailForm, setShowEmailForm] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/clients/${clientId}`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Failed to load client" }));
          throw new Error(errorData?.error || "Failed to load client");
        }
        const data = await res.json();
        if (!cancelled) setClient(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [clientId]);

  async function handleDownloadPDF() {
    setExportingPDF(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/summary-pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `heirvault-${client?.lastName}-${client?.firstName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to download PDF");
    } finally {
      setExportingPDF(false);
    }
  }

  async function handleEmailPDF() {
    if (!emailAddress.trim()) {
      setError("Please enter an email address");
      return;
    }
    
    setEmailingPDF(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/summary-pdf/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddress.trim() }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to email PDF");
      
      setShowEmailForm(false);
      setEmailAddress("");
      alert("PDF report has been sent successfully!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to email PDF");
    } finally {
      setEmailingPDF(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-slateui-600">Loading client information...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !client) {
    return (
      <DashboardLayout>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="text-slateui-600">Client not found.</div>
      </DashboardLayout>
    );
  }

  const fullName = `${client.firstName} ${client.lastName}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/clients")}
              className="btn-secondary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900">
                {fullName}
              </h1>
              <p className="mt-2 text-base text-slateui-600">{client.email}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleDownloadPDF}
              disabled={exportingPDF}
              className="btn-primary"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportingPDF ? "Generating..." : "Download PDF"}
            </Button>
            <Button
              onClick={() => setShowEmailForm(!showEmailForm)}
              className="btn-secondary"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Report
            </Button>
          </div>
        </div>

        {/* Email Form */}
        {showEmailForm && (
          <div className="card p-6">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="label">Email Address</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="recipient@example.com"
                  className="input"
                />
              </div>
              <Button
                onClick={handleEmailPDF}
                disabled={emailingPDF || !emailAddress.trim()}
                className="btn-primary"
              >
                {emailingPDF ? "Sending..." : "Send PDF"}
              </Button>
              <Button
                onClick={() => {
                  setShowEmailForm(false);
                  setEmailAddress("");
                }}
                className="btn-secondary"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Client Invitation */}
        <div className="card p-6">
          <h2 className="font-display text-xl font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-gold-500" />
            Client Invitation
          </h2>
          <p className="text-sm text-slateui-600 mb-4">
            Send an invitation code or link to this client so they can complete their registry and upload policy information.
          </p>
          {client && (
            <InviteClientButton
              clientId={clientId}
              defaultEmail={client.email}
              clientName={fullName}
            />
          )}
        </div>

        {/* Client Information */}
        <div className="card p-6">
          <h2 className="font-display text-xl font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-gold-500" />
            Client Information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoBox label="Phone" value={client.phone || "—"} icon={<Phone className="h-4 w-4" />} />
            <InfoBox 
              label="Date of Birth" 
              value={client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : "—"} 
              icon={<Calendar className="h-4 w-4" />} 
            />
            <InfoBox label="Email" value={client.email} icon={<MailIcon className="h-4 w-4" />} />
            {client.createdAt && (
              <InfoBox 
                label="Created Date" 
                value={new Date(client.createdAt).toLocaleDateString()} 
                icon={<Calendar className="h-4 w-4" />} 
              />
            )}
            {client.attorneyAccess && client.attorneyAccess.length > 0 && (
              <InfoBox 
                label="Created By" 
                value={
                  client.attorneyAccess[0].attorney.firstName && client.attorneyAccess[0].attorney.lastName
                    ? `${client.attorneyAccess[0].attorney.firstName} ${client.attorneyAccess[0].attorney.lastName}`
                    : client.attorneyAccess[0].attorney.email
                }
                icon={<Shield className="h-4 w-4" />} 
              />
            )}
          </div>
        </div>

        {/* Death Certificate Section */}
        {(client.deathCertificateUrl || client.deathCertificateNumber || client.dateOfDeath) && (
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-gold-500" />
              Death Certificate
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {client.deathCertificateNumber && (
                <InfoBox 
                  label="Certificate Number" 
                  value={client.deathCertificateNumber} 
                />
              )}
              {client.dateOfDeath && (
                <InfoBox 
                  label="Date of Death" 
                  value={new Date(client.dateOfDeath).toLocaleDateString()} 
                />
              )}
            </div>
            {client.deathCertificateUrl && (
              <div className="mt-4">
                <a
                  href={client.deathCertificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Death Certificate
                </a>
              </div>
            )}
          </div>
        )}

        {/* Policies Section */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-ink-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gold-500" />
              Policies ({client.policies.length})
            </h2>
            <Button
              onClick={() => router.push(`/dashboard/clients/${clientId}/policies/new`)}
              className="btn-primary"
            >
              Add Policy
            </Button>
          </div>

          {client.policies.length === 0 ? (
            <div className="text-center py-8 text-slateui-600">
              <FileText className="h-12 w-12 mx-auto mb-3 text-slateui-300" />
              <p>No policies recorded yet.</p>
              <Button
                onClick={() => router.push(`/dashboard/clients/${clientId}/policies/new`)}
                className="btn-primary mt-4"
              >
                Add First Policy
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {client.policies.map((policy) => (
                <div
                  key={policy.id}
                  className="rounded-xl border border-slateui-200 bg-paper-50 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-ink-900">
                          {policy.insurer?.name || "Unknown Insurer"}
                        </h3>
                        {policy.insurer?.website && (
                          <a
                            href={policy.insurer.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold-500 hover:text-gold-600"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slateui-600">
                        {policy.policyNumber && (
                          <span>
                            <span className="font-medium">Policy #:</span> {policy.policyNumber}
                          </span>
                        )}
                        {policy.policyType && (
                          <span>
                            <span className="font-medium">Type:</span> {policy.policyType}
                          </span>
                        )}
                        <span>
                          <span className="font-medium">Beneficiaries:</span> {policy.beneficiaries.length}
                        </span>
                      </div>

                      {/* Policy Beneficiaries */}
                      {policy.beneficiaries.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slateui-200">
                          <h4 className="text-sm font-semibold text-ink-900 mb-2">Beneficiaries:</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {policy.beneficiaries.map((pb) => (
                              <div
                                key={pb.beneficiary.id}
                                className="text-sm text-slateui-600 bg-white p-2 rounded border border-slateui-100"
                              >
                                <span className="font-medium text-ink-900">
                                  {pb.beneficiary.firstName} {pb.beneficiary.lastName}
                                </span>
                                {pb.beneficiary.relationship && (
                                  <span className="text-slateui-500"> • {pb.beneficiary.relationship}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/dashboard/policies/${policy.id}`)}
                      className="btn-secondary"
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Beneficiaries Section */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-ink-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-gold-500" />
              Beneficiaries ({client.beneficiaries.length})
            </h2>
            <Button
              onClick={() => router.push(`/dashboard/clients/${clientId}/beneficiaries`)}
              className="btn-primary"
            >
              Manage Beneficiaries
            </Button>
          </div>

          {client.beneficiaries.length === 0 ? (
            <div className="text-center py-8 text-slateui-600">
              <Users className="h-12 w-12 mx-auto mb-3 text-slateui-300" />
              <p>No beneficiaries recorded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.beneficiaries.map((beneficiary) => (
                <div
                  key={beneficiary.id}
                  className="rounded-xl border border-slateui-200 bg-paper-50 p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-base font-semibold text-ink-900 mb-2">
                    {beneficiary.firstName} {beneficiary.lastName}
                  </h3>
                  <div className="space-y-1 text-sm text-slateui-600">
                    {beneficiary.relationship && (
                      <div>
                        <span className="font-medium">Relationship:</span> {beneficiary.relationship}
                      </div>
                    )}
                    {beneficiary.email && (
                      <div>
                        <span className="font-medium">Email:</span> {beneficiary.email}
                      </div>
                    )}
                    {beneficiary.phone && (
                      <div>
                        <span className="font-medium">Phone:</span> {beneficiary.phone}
                      </div>
                    )}
                    {beneficiary.dateOfBirth && (
                      <div>
                        <span className="font-medium">DOB:</span>{" "}
                        {new Date(beneficiary.dateOfBirth).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function InfoBox({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slateui-200 bg-paper-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slateui-500 mb-2">
        {icon}
        {label}
      </div>
      <div className="text-base font-semibold text-ink-900">{value}</div>
    </div>
  );
}
