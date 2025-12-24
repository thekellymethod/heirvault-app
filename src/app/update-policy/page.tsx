// src/app/update-policy/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, FileText, AlertCircle, Camera } from "lucide-react";
import { QRScanner } from "@/components/QRScanner";

type LookupReceiptResponse =
  | { token: string }
  | { error: string };

function isLookupReceiptResponse(value: unknown): value is LookupReceiptResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const hasToken = typeof v.token === "string";
  const hasError = typeof v.error === "string";
  return hasToken || hasError;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unexpected error";
}

export default function UpdatePolicyPage() {
  const router = useRouter();

  const [method, setMethod] = useState<"receipt" | "qr" | null>(null);
  const [receiptId, setReceiptId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handleReceiptSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/receipts/${encodeURIComponent(receiptId)}/lookup`);
      const json: unknown = await res.json();

      if (!isLookupReceiptResponse(json)) {
        throw new Error("Invalid server response");
      }

      if (!res.ok) {
        const msg = "error" in json ? json.error : "Receipt not found";
        throw new Error(msg);
      }

      if (!("token" in json) || !json.token) {
        throw new Error("Receipt lookup succeeded but token is missing");
      }

      router.push(`/invite/${json.token}/update`);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to lookup receipt");
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = (scannedData: string) => {
    setShowScanner(false);
    setError(null);

    // QR may be full URL or raw token. Try both.
    const urlMatch = scannedData.match(/\/invite\/([^\/\?]+)/);
    const rawTokenMatch = scannedData.match(/^[a-f0-9]{48,}$/i);

    const token = urlMatch?.[1] ?? rawTokenMatch?.[0] ?? null;

    if (token) {
      router.push(`/invite/${token}/update`);
    } else {
      setError("Invalid QR code. Please scan a valid HeirVault receipt QR code.");
    }
  };

  return (
    <div className="min-h-screen bg-paper-50">
      <header className="sticky top-0 z-50 border-b border-slateui-200 bg-paper-50/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-6">
            <Logo size="sm" showTagline={false} className="flex-row" href="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 sm:py-12 overflow-y-auto">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl text-ink-900 mb-4">
            Update Life Insurance Policy
          </h1>
          <p className="text-lg text-slateui-600">
            Enter your receipt number or scan your QR code to update your policy information
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        ) : null}

        {!method ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="h-16 w-16 rounded-full bg-gold-500/10 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-gold-600" />
                </div>
              </div>
              <h2 className="font-display text-xl font-semibold text-ink-900 mb-3">
                Enter Receipt Number
              </h2>
              <p className="text-sm text-slateui-600 mb-6">
                Enter the receipt ID from your previous submission
              </p>
              <Button onClick={() => setMethod("receipt")} className="btn-primary w-full">
                Continue with Receipt Number
              </Button>
            </div>

            <div className="card p-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="h-16 w-16 rounded-full bg-gold-500/10 flex items-center justify-center">
                  <QrCode className="h-8 w-8 text-gold-600" />
                </div>
              </div>
              <h2 className="font-display text-xl font-semibold text-ink-900 mb-3">
                Scan QR Code
              </h2>
              <p className="text-sm text-slateui-600 mb-6">
                Scan the QR code from your receipt
              </p>
              <Button onClick={() => setMethod("qr")} className="btn-primary w-full">
                Scan QR Code
              </Button>
            </div>
          </div>
        ) : method === "receipt" ? (
          <div className="card p-8 max-w-md mx-auto">
            <h2 className="font-display text-xl font-semibold text-ink-900 mb-4 text-center">
              Enter Receipt Number
            </h2>

            <form onSubmit={handleReceiptSubmit} className="space-y-4">
              <div>
                <label htmlFor="receipt-id" className="label mb-2 block text-sm">
                  Receipt ID
                </label>
                <Input
                  id="receipt-id"
                  type="text"
                  value={receiptId}
                  onChange={(e) => setReceiptId(e.target.value)}
                  placeholder="REC-1234567890-1234567890"
                  required
                  className="input"
                />
                <p className="text-xs text-slateui-500 mt-1">Found on your registration receipt</p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setMethod(null);
                    setReceiptId("");
                    setError(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Back
                </Button>

                <Button
                  type="submit"
                  disabled={loading || !receiptId.trim()}
                  className="btn-primary flex-1"
                >
                  {loading ? "Looking up..." : "Continue"}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="card p-8 max-w-md mx-auto">
            <h2 className="font-display text-xl font-semibold text-ink-900 mb-4 text-center">
              Scan QR Code
            </h2>

            <div className="space-y-4">
              <div className="bg-white p-6 rounded-lg border border-slateui-200">
                <p className="text-sm text-slateui-600 mb-4 text-center">
                  Use your device camera to scan the QR code from your receipt
                </p>

                <div className="flex justify-center mb-4">
                  <div className="bg-white p-4 rounded-lg border-2 border-dashed border-slateui-300">
                    <QrCode className="h-32 w-32 text-slateui-300" />
                  </div>
                </div>

                <p className="text-xs text-slateui-500 text-center">
                  Camera access required. Please allow camera permissions when prompted.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setMethod(null);
                    setError(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Back
                </Button>

                <Button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="btn-primary flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Open Camera
                </Button>
              </div>
            </div>
          </div>
        )}

        {showScanner ? (
          <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />
        ) : null}

        <div className="mt-8 text-center">
          <p className="text-sm text-slateui-600">
            Need help?{" "}
            <a
              href="mailto:support@heirvault.com"
              className="text-gold-600 hover:text-gold-700 font-medium"
            >
              Contact Support
            </a>
            {" or "}
            <a href="tel:+18001234567" className="text-gold-600 hover:text-gold-700 font-medium">
              Call 1-800-123-4567
            </a>
          </p>

          <p className="text-xs text-blue-900 mt-2">
            To update your email or phone number, please contact customer service or your attorney
          </p>
        </div>
      </main>
    </div>
  );
}
