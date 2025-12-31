// src/app/dashboard/clients/[id]/components/AccessControlPanel.tsx
"use client";

import { useEffect, useState } from "react";

async function getJson(url: string) {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Request failed");
  return json;
}
async function postJson(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Request failed");
  return json;
}

type Attorney = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
};

type Grant = {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  canViewSensitive: boolean;
  canDownload: boolean;
};

export default function AccessControlPanel({ clientId }: { clientId: string }) {
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [canViewSensitive, setCanViewSensitive] = useState(true);
  const [canDownload, setCanDownload] = useState(true);
  const [msg, setMsg] = useState<string>("");

  const load = async () => {
    setMsg("");
    try {
      const [u, g] = await Promise.all([
        getJson("/api/admin/users/attorneys") as Promise<{ users?: Attorney[] }>,
        getJson(`/api/admin/clients/${clientId}/access`) as Promise<{ grants?: Grant[] }>,
      ]);
      setAttorneys(u.users ?? []);
      setGrants(g.grants ?? []);
    } catch (e) {
      const error = e as Error;
      setMsg(error?.message ?? "Failed to load");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const grant = async () => {
    if (!selectedUser) return;
    setMsg("");
    try {
      await postJson(`/api/admin/clients/${clientId}/access/grant`, {
        userId: selectedUser,
        canViewSensitive,
        canDownload,
      });
      setMsg("Saved.");
      await load();
    } catch (e) {
      const error = e as Error;
      setMsg(error?.message ?? "Failed to grant access");
    }
  };

  const revoke = async (userId: string) => {
    setMsg("");
    try {
      await postJson(`/api/admin/clients/${clientId}/access/revoke`, { userId });
      setMsg("Revoked.");
      await load();
    } catch (e) {
      const error = e as Error;
      setMsg(error?.message ?? "Failed to revoke access");
    }
  };

  return (
    <div className="rounded-2xl border p-5 space-y-3">
      <div className="font-semibold">Access Control (Admin)</div>

      <div className="flex flex-col gap-2">
        <select className="border rounded-lg px-3 py-2" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
          <option value="">Select attorney</option>
          {attorneys.map((a) => (
            <option key={a.id} value={a.id}>
              {a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : a.email} ({a.id})
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={canViewSensitive} onChange={(e) => setCanViewSensitive(e.target.checked)} />
          Can view sensitive originals (reason-gated)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={canDownload} onChange={(e) => setCanDownload(e.target.checked)} />
          Can download originals (reason-gated)
        </label>

        <button className="px-4 py-2 rounded-lg border w-fit" onClick={grant} disabled={!selectedUser}>
          Grant / Update
        </button>
      </div>

      <div className="pt-2">
        <div className="font-medium text-sm mb-2">Current grants</div>
        <div className="space-y-2">
          {grants.map((g) => (
            <div key={g.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
              <div className="text-sm">
                <div className="font-medium">{g.userName || g.userEmail || g.userId}</div>
                <div className="text-xs text-slate-600">
                  Sensitive: {String(g.canViewSensitive)} • Download: {String(g.canDownload)}
                </div>
              </div>
              <button className="px-3 py-1 rounded-lg border" onClick={() => revoke(g.userId)}>
                Revoke
              </button>
            </div>
          ))}
          {!grants.length && <div className="text-sm text-slate-500">No grants.</div>}
        </div>
      </div>

      {msg && <div className="text-sm text-slate-700">{msg}</div>}
    </div>
  );
}


