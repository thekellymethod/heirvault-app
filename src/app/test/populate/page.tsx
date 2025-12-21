"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface TestInvite {
  token: string;
  email: string;
  name: string;
  url: string;
}

interface PopulateResult {
  invites?: TestInvite[];
}

interface CheckResult {
  token: string;
  exists?: boolean;
  invite?: {
    isValid: boolean;
    daysSinceExpiration: number;
  };
  error?: string;
}

export default function PopulateTestCodesPage() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="min-h-screen bg-paper-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-3xl font-bold text-ink-900 mb-6">Access Denied</h1>
          <p className="text-slateui-600">This page is only available in development mode.</p>
        </div>
      </div>
    );
  }

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PopulateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkingToken, setCheckingToken] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);

  const populateCodes = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setCheckResult(null);

    try {
      const res = await fetch("/api/test/populate-invites", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to populate codes");
      }

      setResult(data);
    } catch (e: any) {
      setError(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const checkToken = async (token: string) => {
    setCheckingToken(token);
    setCheckResult(null);

    try {
      const res = await fetch(`/api/test/check-invite?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      setCheckResult({ token, ...data });
    } catch (e: any) {
      setCheckResult({ token, error: e.message });
    } finally {
      setCheckingToken(null);
    }
  };

  return (
    <div className="min-h-screen bg-paper-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-3xl font-bold text-ink-900 mb-6">
          Populate Test Invitation Codes
        </h1>

        <div className="card p-6 mb-6">
          <p className="text-slateui-600 mb-4">
            Click the button below to create test invitation codes in the database.
            These codes can be used to test the client invitation portal.
          </p>

          <Button
            onClick={populateCodes}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Creating codes..." : "Populate Test Codes"}
          </Button>
        </div>

        {error && (
          <div className="card p-6 mb-6 border-red-200 bg-red-50">
            <h2 className="font-semibold text-red-900 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="card p-6">
            <h2 className="font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Test Codes Created Successfully!
            </h2>

            <div className="space-y-4">
              <p className="text-slateui-600">
                The following test invitation codes are now available:
              </p>

              <div className="space-y-3">
                {result.invites?.map((invite: any, index: number) => (
                  <div
                    key={invite.token}
                    className="border border-slateui-200 rounded-lg p-4 bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-ink-900">
                            Test Code #{index + 1}
                          </span>
                          <span className="text-xs text-slateui-500 bg-slateui-100 px-2 py-1 rounded">
                            {invite.name}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-slateui-600">Email:</span>{" "}
                            <span className="font-mono text-ink-900">
                              {invite.email}
                            </span>
                          </div>
                          <div>
                            <span className="text-slateui-600">Token:</span>{" "}
                            <span className="font-mono text-ink-900 bg-slateui-50 px-2 py-1 rounded">
                              {invite.token}
                            </span>
                          </div>
                          <div>
                            <span className="text-slateui-600">URL:</span>{" "}
                            <a
                              href={invite.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gold-600 hover:text-gold-700 font-medium underline"
                            >
                              {invite.url}
                            </a>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => checkToken(invite.token)}
                          disabled={checkingToken === invite.token}
                          className="text-xs"
                        >
                          {checkingToken === invite.token ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Verify"
                          )}
                        </Button>
                      </div>
                    </div>
                    {checkResult && checkResult.token === invite.token && (
                      <div className="mt-3 pt-3 border-t border-slateui-200">
                        {checkResult.exists ? (
                          <div className="flex items-center gap-2 text-sm">
                            {checkResult.invite.isValid ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-green-700">
                                  Valid - Expires in {Math.round(checkResult.invite.daysSinceExpiration * -1)} days
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="text-red-700">
                                  Expired ({Math.round(checkResult.invite.daysSinceExpiration)} days ago)
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-red-700">
                            <XCircle className="h-4 w-4" />
                            <span>Not found in database</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">
                  How to Use These Codes:
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Go to: <code className="bg-blue-100 px-1 rounded">/client/invite-code</code></li>
                  <li>Enter any of the tokens above (e.g., <code className="bg-blue-100 px-1 rounded">TEST-CODE-001</code>)</li>
                  <li>Or directly visit any of the URLs above</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

