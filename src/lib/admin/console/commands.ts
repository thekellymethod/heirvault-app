// src/lib/client/command.ts

export type ClientCommand =
  | { type: "fingerprint"; payload?: Record<string, unknown> }
  | { type: "audit"; payload: { event: string; meta?: Record<string, unknown> } };

export type ClientCommandResponse<T = unknown> = {
  ok: boolean;
  requestId?: string;
  type?: string;
  error?: string;
} & T;

type CommandOptions = {
  timezone?: string; // optional helper for the fingerprint endpoint
};

export async function command<T = unknown>(
  cmd: ClientCommand,
  opts: CommandOptions = {}
): Promise<ClientCommandResponse<T>> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  // Optional: helps stabilize fingerprint across proxies/NATs for debugging
  if (opts.timezone) headers["x-client-timezone"] = opts.timezone;

  const res = await fetch("/api/client", {
    method: "POST",
    headers,
    body: JSON.stringify(cmd),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as ClientCommandResponse<T> | null;

  if (!data) {
    return { ok: false, error: "Failed to parse response JSON" } as ClientCommandResponse<T>;
  }

  if (!res.ok) {
    return { ok: false, error: data.error } as ClientCommandResponse<T>;
  }

  return data as ClientCommandResponse<T>;  
}
