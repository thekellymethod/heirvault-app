"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

type ProvisionResponse =
  | { ok: true; user: { id: string; clerkId: string; role: string; email: string | null } }
  | { ok: false; error: string };

export default function AttorneySignUpCompletePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [status, setStatus] = React.useState<"working" | "error">("working");
  const [error, setError] = React.useState<string | null>(null);

  const hasTriggeredRef = React.useRef(false);
  const inFlightRef = React.useRef<AbortController | null>(null);

  const runProvision = React.useCallback(async () => {
    // If this page is rendered twice in dev (React Strict Mode),
    // avoid racing multiple provisioning requests.
    if (inFlightRef.current) {
      inFlightRef.current.abort();
    }

    setStatus("working");
    setError(null);

    const controller = new AbortController();
    inFlightRef.current = controller;

    let abortedByTimeout = false;
    const timeoutId = window.setTimeout(() => {
      abortedByTimeout = true;
      controller.abort();
    }, 15000);

    try {
      const res = await fetch("/api/user/provision", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Provision did not return JSON (status ${res.status}). First bytes: ${text.slice(0, 120)}`
        );
      }

      const data = (await res.json()) as ProvisionResponse;

      if (!res.ok || !data.ok) {
        throw new Error(!data.ok ? data.error : `Provision failed (${res.status})`);
      }

      router.replace("/dashboard");
    } catch (e) {
      // Ignore aborted requests that we initiated (ex: Strict Mode double render).
      const isAbort =
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");

      if (isAbort && !abortedByTimeout) return;

      const msg = isAbort && abortedByTimeout ? "Request timed out. Please retry." : e instanceof Error ? e.message : "Provision failed";
      setError(msg);
      setStatus("error");
    } finally {
      clearTimeout(timeoutId);
      if (inFlightRef.current === controller) {
        inFlightRef.current = null;
      }
    }
  }, [router]);

  React.useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.replace("/attorney/sign-in");
      return;
    }

    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    runProvision();
  }, [isLoaded, user, router, runProvision]);

  React.useEffect(() => {
    return () => {
      inFlightRef.current?.abort();
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full max-w-md space-y-6 px-6 text-center">
        {status === "working" && (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
            <h1 className="text-xl font-semibold text-slate-900">Setting up your attorney account…</h1>
            <p className="text-sm text-slate-600">This should only take a moment.</p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-xl font-semibold text-slate-900">Setup didn’t complete</h1>
            <p className="text-sm text-slate-600 break-words">{error ?? "Unknown error."}</p>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={runProvision}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Retry
              </button>
              <button
                onClick={() => router.replace("/attorney/sign-in")}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
