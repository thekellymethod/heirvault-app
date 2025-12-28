// src/app/dashboard/clients/[id]/components/ReceiptsPanel.tsx
"use client";

export default function ReceiptsPanel({ receipts, onOpen }: { receipts: any[]; onOpen: (id: string) => void }) {
  return (
    <div className="rounded-2xl border p-5">
      <div className="font-semibold mb-3">Receipts</div>
      <div className="space-y-2">
        {receipts.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
            <div className="text-sm min-w-0 flex-1">
              <div className="font-medium">{r.receiptNumber ?? "Receipt"}</div>
              <div className="text-xs text-slate-600">
                {new Date(r.createdAt).toLocaleString()} • {r.kind ?? "—"}
              </div>
            </div>
            {r.artifactId && (
              <button className="px-3 py-1 rounded-lg border text-sm" onClick={() => onOpen(r.artifactId)}>
                Open PDF
              </button>
            )}
          </div>
        ))}
        {!receipts.length && <div className="text-sm text-slate-500">No receipts yet.</div>}
      </div>
    </div>
  );
}


