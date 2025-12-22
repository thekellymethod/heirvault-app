"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ExecResponse =
  | { ok: true; data: any; meta?: any }
  | { ok: false; error: string; details?: any; meta?: any };

type HistoryItem = {
  id: string;
  ts: number;
  cmd: string;
  args: Record<string, any>;
  res?: ExecResponse;
};

const PRESETS: Array<{ cmd: string; args: Record<string, any> }> = [
  { cmd: "help", args: {} },
  { cmd: "auth:whoami", args: {} },
  { cmd: "db:health", args: {} },
  { cmd: "migrations:status", args: { limit: 25 } },
  { cmd: "logs:recent", args: { limit: 50 } },
  { cmd: "attorney:lookup", args: { email: "admin@heirvault.app" } },
];

function safeJsonParse(input: string): { ok: true; value: any } | { ok: false; error: string } {
  try {
    const v = JSON.parse(input);
    return { ok: true, value: v };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Invalid JSON" };
  }
}

export default function ConsoleClient() {
  const [cmd, setCmd] = useState("help");
  const [argsText, setArgsText] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hint, setHint] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const argsObj = useMemo(() => {
    const parsed = safeJsonParse(argsText);
    return parsed.ok ? parsed.value : null;
  }, [argsText]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.length]);

  async function runCommand(inputCmd?: string, inputArgs?: Record<string, any>) {
    const c = (inputCmd ?? cmd).trim();
    const a = inputArgs ?? (argsObj && typeof argsObj === "object" ? argsObj : null);

    if (!c) {
      setHint("Command is required.");
      return;
    }
    if (a === null) {
      setHint("Args must be valid JSON object (e.g., {}).");
      return;
    }

    setHint(null);
    setBusy(true);

    const item: HistoryItem = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      cmd: c,
      args: a,
    };

    setHistory((h) => [...h, item]);

    try {
      const res = await fetch("/api/admin/console", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cmd: c, args: a }),
      });

      const json = (await res.json()) as ExecResponse;
      setHistory((h) => h.map((x) => (x.id === item.id ? { ...x, res: json } : x)));
    } catch (e: any) {
      const json: ExecResponse = { ok: false, error: "Network error.", details: { message: e?.message } };
      setHistory((h) => h.map((x) => (x.id === item.id ? { ...x, res: json } : x)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900"
            onClick={() => {
              setCmd(p.cmd);
              setArgsText(JSON.stringify(p.args, null, 2));
            }}
            type="button"
          >
            {p.cmd}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Command</label>
          <input
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            placeholder='e.g. "db:health"'
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            disabled={busy}
            onClick={() => runCommand()}
            className="w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-60"
            type="button"
          >
            {busy ? "Running…" : "Run"}
          </button>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-zinc-400">Args (JSON)</label>
          <textarea
            value={argsText}
            onChange={(e) => setArgsText(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 outline-none focus:border-zinc-600"
            spellCheck={false}
          />
          {hint && <p className="mt-2 text-xs text-red-400">{hint}</p>}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="text-sm font-medium">History</div>
          <button
            type="button"
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900"
            onClick={() => setHistory([])}
          >
            Clear
          </button>
        </div>

        <div className="max-h-[520px] overflow-auto p-4">
          {history.length === 0 ? (
            <div className="text-sm text-zinc-400">No commands executed yet.</div>
          ) : (
            <div className="space-y-4">
              {history.map((h) => (
                <div key={h.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-xs text-zinc-200">
                      <span className="text-zinc-500">$</span> {h.cmd}{" "}
                      <span className="text-zinc-500">{Object.keys(h.args || {}).length ? JSON.stringify(h.args) : ""}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {new Date(h.ts).toLocaleString()}
                    </div>
                  </div>

                  <div className="mt-2">
                    {!h.res ? (
                      <div className="text-xs text-zinc-400">Running…</div>
                    ) : h.res.ok ? (
                      <pre className="mt-2 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-100">
                        {JSON.stringify(h.res, null, 2)}
                      </pre>
                    ) : (
                      <pre className="mt-2 overflow-auto rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-200">
                        {JSON.stringify(h.res, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

