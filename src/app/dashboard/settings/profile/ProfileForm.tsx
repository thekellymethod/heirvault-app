"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Shield, Building2, Mail, Phone, MapPin, Scale } from "lucide-react";

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  barNumber: string | null;
}

interface Organization {
  id: string;
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
}

interface Props {
  user: User;
  organization: Organization | null;
}

export function ProfileForm({ user, organization }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [barNumber, setBarNumber] = useState(user.barNumber || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!firstName || !lastName) {
      setError("First name and last name are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/user/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          barNumber: barNumber.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile.");
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const fullAddress = organization ? [
    organization.addressLine1,
    organization.addressLine2,
    organization.city,
    organization.state,
    organization.postalCode,
    organization.country,
  ]
    .filter(Boolean)
    .join(", ") : "";

  return (
    <div className="space-y-6">
      {/* Attorney Information */}
      <div className="card p-6">
        <h2 className="font-display text-xl font-semibold text-ink-900 mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-gold-500" />
          Attorney Information
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              Profile updated successfully.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-first-name" className="label">First Name <span className="text-red-500">*</span></label>
              <input
                id="profile-first-name"
                className="input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="profile-last-name" className="label">Last Name <span className="text-red-500">*</span></label>
              <input
                id="profile-last-name"
                className="input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="label flex items-center gap-2">
              <Scale className="h-4 w-4 text-slateui-500" />
              Bar Number
            </label>
            <input
              className="input"
              value={barNumber}
              onChange={(e) => setBarNumber(e.target.value)}
              placeholder="Enter your bar number"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </div>

      {/* Firm Information (Read-only) */}
      {organization ? (
        <div className="card p-6">
          <h2 className="font-display text-xl font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gold-500" />
            Firm Information
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoBox
              label="Firm Name"
              value={organization.name}
              icon={<Building2 className="h-4 w-4" />}
            />
            <InfoBox
              label="Email"
              value={user.email}
              icon={<Mail className="h-4 w-4" />}
            />
            {organization.phone && (
              <InfoBox
                label="Phone"
                value={organization.phone}
                icon={<Phone className="h-4 w-4" />}
              />
            )}
            {fullAddress && (
              <InfoBox
                label="Address"
                value={fullAddress}
                icon={<MapPin className="h-4 w-4" />}
                fullWidth
              />
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slateui-200">
            <Button
              onClick={() => router.push("/dashboard/settings/org")}
              className="btn-secondary"
            >
              Edit Firm Settings
            </Button>
          </div>
        </div>
      ) : (
        <div className="card p-6">
          <h2 className="font-display text-xl font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gold-500" />
            Firm Information
          </h2>
          <p className="text-slateui-600 mb-4">
            {"You don't have an organization yet. Create one to manage team members and billing."}
          </p>
          <Button
            onClick={() => router.push("/attorney/onboard")}
            className="btn-primary"
          >
            Create Organization
          </Button>
        </div>
      )}
    </div>
  );
}

function InfoBox({
  label,
  value,
  icon,
  fullWidth = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <div className="rounded-xl border border-slateui-200 bg-paper-50 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slateui-500 mb-2">
          {icon}
          {label}
        </div>
        <div className="text-base font-semibold text-ink-900">{value}</div>
      </div>
    </div>
  );
}

