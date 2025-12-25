"use client";

import { useState } from "react";
import type { OrgMember, User, OrgRole } from "@/lib/db";

interface MemberWithUser extends OrgMember {
  user: User;
}

interface Props {
  members: MemberWithUser[];
  currentUserId: string,
}

export function TeamManagement({
  members,
  currentUserId,
}: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("ATTORNEY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function inviteMember() {
    setError(null);
    if (!email) {
      setError("Email is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/org/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to invite member.");
      }
      // In v1: just clear; you can later refresh list
      setEmail("");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs">
        <div className="mb-3 font-semibold text-slate-100">
          Invite a team member
        </div>
        {error && (
          <p className="mb-2 text-[11px] text-red-400 bg-red-950/40 border border-red-800 rounded px-2 py-1">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            placeholder="Work email"
            className="flex-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Work email"
          />
          <select
            className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={role}
            onChange={(e) => setRole(e.target.value as OrgRole)}
            aria-label="Team member role"
          >
            <option value="ATTORNEY">Attorney</option>
            <option value="STAFF">Staff</option>
          </select>
          <button
            onClick={inviteMember}
            disabled={loading}
            className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "Inviting..." : "Invite"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs">
        <div className="mb-2 font-semibold text-slate-100">
          Current team
        </div>
        {members.length === 0 ? (
          <p className="text-slate-400">No members yet.</p>
        ) : (
          <ul className="space-y-1">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between border-b border-slate-800/60 py-1 last:border-b-0"
              >
                <div>
                  <div className="text-slate-100">
                    {m.user.email}
                    {m.user.id === currentUserId && (
                      <span className="ml-1 text-[10px] text-emerald-300">
                        (you)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Role: {m.role}
                  </div>
                </div>
                {/* Later: add "Remove" / "Change role" for OWNERs */}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

