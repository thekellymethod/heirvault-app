"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface InviteMemberFormProps {
  organizationId: string;
}

export function InviteMemberForm({ organizationId }: InviteMemberFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"OWNER" | "ATTORNEY" | "STAFF">("ATTORNEY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/org/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, organizationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to invite member");
      }

      setSuccess(true);
      setEmail("");
      // Refresh the page to show the new member
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="flex-1">
        <label htmlFor="email" className="block text-xs text-slate-400 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="attorney@example.com"
          required
          className="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-700 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="role" className="block text-xs text-slate-400 mb-1">
          Role
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as "OWNER" | "ATTORNEY" | "STAFF")}
          className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:border-slate-700 focus:outline-none"
        >
          <option value="ATTORNEY">Attorney</option>
          <option value="STAFF">Staff</option>
          <option value="OWNER">Owner</option>
        </select>
      </div>
      <Button type="submit" disabled={loading} size="default">
        {loading ? "Inviting..." : "Invite"}
      </Button>
      {error && (
        <div className="text-xs text-red-400 mt-1">{error}</div>
      )}
      {success && (
        <div className="text-xs text-green-400 mt-1">Invitation sent!</div>
      )}
    </form>
  );
}

