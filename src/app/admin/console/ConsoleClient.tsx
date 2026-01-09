"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ExecResponse =
  | { ok: true; data: unknown; meta?: unknown }
  | { ok: false; error: string, details?: unknown; meta?: unknown };

type HistoryItem = {
  id: string,
  ts: number;
  cmd: string,
  args: Record<string, unknown>;
  res?: ExecResponse;
};

type NLPlan = {
  cmd: string | null;
  args: Record<string, unknown>;
  next: Array<{ cmd: string, args: Record<string, unknown> }>;
  requiresConfirm: boolean;
  confidence: number;
  explanation: string,
  safetyFlags: string[];
};

type PlanResponse = {
  ok: true;
  data: {
    plan: NLPlan;
    auditId: string,
  };
} | {
  ok: false;
  error: string,
};

const PRESETS: Array<{ cmd: string, args: Record<string, unknown> }> = [
  { cmd: "help", args: {} },
  { cmd: "auth:whoami", args: {} },
  { cmd: "db:health", args: {} },
  { cmd: "migrations:status", args: { limit: 25 } },
  { cmd: "logs:recent", args: { limit: 50 } },
  { cmd: "attorney:lookup", args: { email: "admin@heirvault.app" } },
];

function safeJsonParse(input: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    const v = JSON.parse(input);
    return { ok: true, value: v };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message };
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setHint(`Network error: ${message}`);
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      const json: ExecResponse = { ok: false, error: "Network error.", details: { message } };
      setHistory((h) => h.map((x) => (x.id === item.id ? { ...x, res: json } : x)));
    } finally {
      setBusy(false);
    }
  }

  async function runCommand(inputCmd?: string, inputArgs?: Record<string, unknown>) {
    const c = (inputCmd ?? cmd).trim();
    const parsedArgs = argsObj && typeof argsObj === "object" && !Array.isArray(argsObj) && argsObj !== null
      ? (argsObj as Record<string, unknown>)
      : null;
    const a = inputArgs ?? parsedArgs;

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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      const json: ExecResponse = { ok: false, error: "Network error.", details: { message } };
      setHistory((h) => h.map((x) => (x.id === item.id ? { ...x, res: json } : x)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2 border-b border-slateui-200">
        <button
          onClick={() => {
            setMode("command");
            setCurrentPlan(null);
            setConfirmed(false);
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === "command"
              ? "border-b-2 border-gold-600 text-ink-900"
              : "text-slateui-600 hover:text-ink-900"
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
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === "nl"
              ? "border-b-2 border-gold-600 text-ink-900"
              : "text-slateui-600 hover:text-ink-900"
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
                className="rounded-lg border border-slateui-200 bg-white px-3 py-1.5 text-xs text-ink-900 hover:bg-slateui-50 transition-colors font-mono"
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
              <label htmlFor="command-input" className="mb-1 block text-xs text-slateui-600 font-medium">Command</label>
              <input
                id="command-input"
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                className="w-full rounded-lg border border-slateui-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-gold-600 focus:ring-1 focus:ring-gold-600"
                placeholder='e.g. "attorney:verify"'
                aria-label="Command input"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                disabled={busy}
                onClick={() => runCommand()}
                className="w-full rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-ink-900 hover:bg-gold-500 disabled:opacity-60 transition-colors"
                type="button"
              >
                {busy ? "Running…" : "Run"}
              </button>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-slateui-600 font-medium">Args (JSON)</label>
              <textarea
                value={argsText}
                onChange={(e) => setArgsText(e.target.value)}
                rows={6}
                aria-label="Command arguments (JSON)"
                placeholder='Enter arguments as JSON (e.g., {"userId": "user_123"})'
                className="w-full rounded-lg border border-slateui-200 bg-white px-3 py-2 font-mono text-xs text-ink-900 outline-none focus:border-gold-600 focus:ring-1 focus:ring-gold-600"
                spellCheck={false}
              />
              {hint && <p className="mt-2 text-xs text-red-600">{hint}</p>}
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-xs text-slateui-600 font-medium">Natural Language Request</label>
            <textarea
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              rows={4}
              aria-label="Natural language command"
              placeholder='e.g., "Verify attorney license for user_123" or "List all users"'
              className="w-full rounded-lg border border-slateui-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-gold-600 focus:ring-1 focus:ring-gold-600"
            />
            {hint && <p className="mt-2 text-xs text-red-600">{hint}</p>}
          </div>

          <div className="flex gap-2">
            <button
              disabled={planning}
              onClick={generatePlan}
              className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-ink-900 hover:bg-gold-500 disabled:opacity-60 transition-colors"
              type="button"
            >
              {planning ? "Generating Plan…" : "Generate Plan"}
            </button>
          </div>

          {/* Plan Display */}
          {currentPlan && (
            <div className="rounded-lg border border-slateui-200 bg-slateui-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-ink-900">Proposed Plan</h3>
                {currentPlan.confidence > 0 && (
                  <span className="text-xs text-slateui-600">
                    Confidence: {Math.round(currentPlan.confidence * 100)}%
                  </span>
                )}
              </div>

              {currentPlan.cmd ? (
                <>
                  <div className="mb-2 space-y-1">
                    <div className="font-mono text-xs text-ink-900">
                      <span className="text-slateui-600">Command:</span> {currentPlan.cmd}
                    </div>
                    {Object.keys(currentPlan.args).length > 0 && (
                      <div className="font-mono text-xs text-ink-900">
                        <span className="text-slateui-600">Args:</span> {JSON.stringify(currentPlan.args, null, 2)}
                      </div>
                    )}
                  </div>

                  {currentPlan.explanation && (
                    <div className="mb-2 text-xs text-slateui-600">{currentPlan.explanation}</div>
                  )}

                  {currentPlan.safetyFlags.length > 0 && (
                    <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      <strong>Safety Flags:</strong> {currentPlan.safetyFlags.join(", ")}
                    </div>
                  )}

                  {currentPlan.requiresConfirm && (
                    <div className="mb-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="confirm-write"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="rounded border-slateui-300 bg-white text-gold-600 focus:ring-gold-600"
                        aria-label="Confirm write operation"
                      />
                      <label htmlFor="confirm-write" className="text-xs text-slateui-600">
                        I confirm this write operation
                      </label>
                    </div>
                  )}

                  <button
                    disabled={busy || (currentPlan.requiresConfirm && !confirmed)}
                    onClick={executePlan}
                    className="w-full rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-ink-900 hover:bg-gold-500 disabled:opacity-60 transition-colors"
                    type="button"
                  >
                    {busy ? "Executing…" : "Execute Plan"}
                  </button>
                </>
              ) : (
                <div className="text-xs text-slateui-600">{currentPlan.explanation || "No valid command found."}</div>
              )}
            </div>
          )}
        </>
      )}

      <div className="rounded-xl border border-slateui-200 bg-white">
        <div className="flex items-center justify-between border-b border-slateui-200 px-4 py-3">
          <div className="text-sm font-medium text-ink-900">History</div>
          <button
            type="button"
            className="rounded-lg border border-slateui-200 bg-white px-3 py-1.5 text-xs text-ink-900 hover:bg-slateui-50 transition-colors"
            onClick={() => setHistory([])}
          >
            Clear
          </button>
        </div>

        <div className="max-h-[520px] overflow-auto p-4">
          {history.length === 0 ? (
            <div className="text-sm text-slateui-600">No commands executed yet.</div>
          ) : (
            <div className="space-y-4">
              {history.map((h) => (
                <div key={h.id} className="rounded-lg border border-slateui-200 bg-slateui-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-xs text-ink-900">
                      <span className="text-slateui-600">$</span> {h.cmd}{" "}
                      <span className="text-slateui-600">{Object.keys(h.args || {}).length ? JSON.stringify(h.args) : ""}</span>
                    </div>
                    <div className="text-[11px] text-slateui-600">
                      {new Date(h.ts).toLocaleString()}
                    </div>
                  </div>

                  <div className="mt-2">
                    {!h.res ? (
                      <div className="text-xs text-slateui-600">Running…</div>
                    ) : h.res.ok ? (
                      <pre className="mt-2 overflow-auto rounded-lg border border-slateui-200 bg-ink-900 p-3 text-xs text-paper-100">
                        {JSON.stringify(h.res, null, 2)}
                      </pre>
                    ) : (
                      <pre className="mt-2 overflow-auto rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900">
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

