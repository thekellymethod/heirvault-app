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

type NLPlan = {
  cmd: string | null;
  args: Record<string, any>;
  next: Array<{ cmd: string; args: Record<string, any> }>;
  requiresConfirm: boolean;
  confidence: number;
  explanation: string;
  safetyFlags: string[];
};

type PlanResponse = {
  ok: true;
  data: {
    plan: NLPlan;
    auditId: string;
  };
} | {
  ok: false;
  error: string;
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
  const [mode, setMode] = useState<"command" | "nl">("command");
  const [cmd, setCmd] = useState("help");
  const [argsText, setArgsText] = useState("{}");
  const [nlText, setNlText] = useState("");
  const [busy, setBusy] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<NLPlan | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const argsObj = useMemo(() => {
    const parsed = safeJsonParse(argsText);
    return parsed.ok ? parsed.value : null;
  }, [argsText]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.length]);

  async function generatePlan() {
    const text = nlText.trim();
    if (!text) {
      setHint("Please enter a natural language request.");
      return;
    }

    setHint(null);
    setPlanning(true);
    setCurrentPlan(null);
    setConfirmed(false);

    try {
      const res = await fetch("/api/admin/nl/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const json = (await res.json()) as PlanResponse;
      if (json.ok) {
        setCurrentPlan(json.data.plan);
        if (!json.data.plan.cmd) {
          setHint(json.data.plan.explanation || "Could not generate a plan.");
        }
      } else {
        setHint(json.error || "Failed to generate plan.");
      }
    } catch (e: any) {
      setHint(`Network error: ${e?.message}`);
    } finally {
      setPlanning(false);
    }
  }

  async function executePlan() {
    if (!currentPlan || !currentPlan.cmd) {
      setHint("No valid plan to execute.");
      return;
    }

    if (currentPlan.requiresConfirm && !confirmed) {
      setHint("Please confirm before executing write commands.");
      return;
    }

    setHint(null);
    setBusy(true);

    const item: HistoryItem = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      cmd: currentPlan.cmd,
      args: currentPlan.args,
    };

    setHistory((h) => [...h, item]);

    try {
      const res = await fetch("/api/admin/nl/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cmd: currentPlan.cmd,
          args: currentPlan.args,
          confirmed: currentPlan.requiresConfirm ? confirmed : undefined,
        }),
      });

      const json = (await res.json()) as ExecResponse;
      setHistory((h) => h.map((x) => (x.id === item.id ? { ...x, res: json } : x)));
      
      // Clear plan after execution
      if (json.ok) {
        setCurrentPlan(null);
        setConfirmed(false);
        setNlText("");
      }
    } catch (e: any) {
      const json: ExecResponse = { ok: false, error: "Network error.", details: { message: e?.message } };
      setHistory((h) => h.map((x) => (x.id === item.id ? { ...x, res: json } : x)));
    } finally {
      setBusy(false);
    }
  }

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
      {/* Mode Toggle */}
      <div className="flex gap-2 border-b border-zinc-800">
        <button
          onClick={() => {
            setMode("command");
            setCurrentPlan(null);
            setConfirmed(false);
          }}
          className={`px-4 py-2 text-sm font-medium ${
            mode === "command"
              ? "border-b-2 border-zinc-100 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          type="button"
        >
          Command Mode
        </button>
        <button
          onClick={() => {
            setMode("nl");
            setCurrentPlan(null);
            setConfirmed(false);
          }}
          className={`px-4 py-2 text-sm font-medium ${
            mode === "nl"
              ? "border-b-2 border-zinc-100 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          type="button"
        >
          Natural Language
        </button>
      </div>

      {mode === "command" ? (
        <>
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
        </>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Natural Language Request</label>
            <textarea
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              placeholder='e.g., "Who am I?" or "Check database health" or "Lookup attorney john@example.com"'
            />
            {hint && <p className="mt-2 text-xs text-red-400">{hint}</p>}
          </div>

          <div className="flex gap-2">
            <button
              disabled={planning}
              onClick={generatePlan}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-60"
              type="button"
            >
              {planning ? "Generating Plan…" : "Generate Plan"}
            </button>
          </div>

          {/* Plan Display */}
          {currentPlan && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-100">Proposed Plan</h3>
                {currentPlan.confidence > 0 && (
                  <span className="text-xs text-zinc-400">
                    Confidence: {Math.round(currentPlan.confidence * 100)}%
                  </span>
                )}
              </div>

              {currentPlan.cmd ? (
                <>
                  <div className="mb-2 space-y-1">
                    <div className="font-mono text-xs text-zinc-200">
                      <span className="text-zinc-500">Command:</span> {currentPlan.cmd}
                    </div>
                    {Object.keys(currentPlan.args).length > 0 && (
                      <div className="font-mono text-xs text-zinc-200">
                        <span className="text-zinc-500">Args:</span> {JSON.stringify(currentPlan.args, null, 2)}
                      </div>
                    )}
                  </div>

                  {currentPlan.explanation && (
                    <div className="mb-2 text-xs text-zinc-300">{currentPlan.explanation}</div>
                  )}

                  {currentPlan.safetyFlags.length > 0 && (
                    <div className="mb-2 text-xs text-yellow-400">
                      Safety Flags: {currentPlan.safetyFlags.join(", ")}
                    </div>
                  )}

                  {currentPlan.requiresConfirm && (
                    <div className="mb-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="confirm-write"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-950"
                      />
                      <label htmlFor="confirm-write" className="text-xs text-zinc-300">
                        I confirm this write operation
                      </label>
                    </div>
                  )}

                  <button
                    disabled={busy || (currentPlan.requiresConfirm && !confirmed)}
                    onClick={executePlan}
                    className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    type="button"
                  >
                    {busy ? "Executing…" : "Execute Plan"}
                  </button>
                </>
              ) : (
                <div className="text-xs text-zinc-400">{currentPlan.explanation || "No valid command found."}</div>
              )}
            </div>
          )}
        </>
      )}

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

