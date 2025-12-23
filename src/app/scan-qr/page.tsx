"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { QRScanner } from "@/components/QRScanner";
import { QrCode, AlertCircle, CheckCircle, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ScanQRPage() {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);

  const handleQRScan = async (scannedData: string) => {
    setShowScanner(false);
    setError(null);
    setValidating(true);

    try {
      // Extract token from QR code URL
      // QR codes might contain full URLs like: /update-policy/{token} or just the token
      let qrToken: string | null = null;

      // Try to match full URL pattern: /update-policy/{token}
      const urlMatch = scannedData.match(/\/update-policy\/([^\/\?]+)/);
      if (urlMatch) {
        qrToken = urlMatch[1];
      } else {
        // Try to match just the token (base64url format with dots)
        // QR tokens are JWT-like: header.payload.signature
        const tokenMatch = scannedData.match(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
        if (tokenMatch) {
          qrToken = tokenMatch[0];
        } else {
          // Try to match invite token format (hex string, typically 48 chars)
          const inviteTokenMatch = scannedData.match(/^[a-f0-9]{48,}$/i);
          if (inviteTokenMatch) {
            // This is an invite token, redirect directly
            router.push(`/qr-update/${inviteTokenMatch[0]}`);
            return;
          }
        }
      }

      if (!qrToken) {
        throw new Error("Invalid QR code format. Please scan a valid HeirVault receipt QR code.");
      }

      // Validate the QR token and get the invite token
      const res = await fetch("/api/qr/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to validate QR code");
      }

      // QR code validated successfully
      setValidating(false);
      setValidated(true);

      // Redirect to the update form with the invite token
      setTimeout(() => {
        router.push(`/qr-update/${data.inviteToken}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while validating the QR code");
      setValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slateui-200 bg-paper-50/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-6">
            <Logo size="sm" showTagline={false} className="flex-row" href="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl text-ink-900 mb-4">
            Scan QR Code to Update Policy
          </h1>
          <p className="text-lg text-slateui-600">
            Scan the QR code from your receipt to access your policy update form
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {validated && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900">QR Code Validated</p>
              <p className="text-sm text-green-700">
                Redirecting to update form...
              </p>
            </div>
          </div>
        )}

        {validating && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <p className="text-sm text-blue-700">Validating QR code and matching to your record...</p>
          </div>
        )}

        <div className="card p-8 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-500/10">
              <QrCode className="h-8 w-8 text-gold-600" />
            </div>
            <h2 className="font-display text-xl font-semibold text-ink-900 mb-2">
              Scan Your Receipt QR Code
            </h2>
            <p className="text-sm text-slateui-600">
              Use your device camera to scan the QR code from your receipt. 
              The code will be authenticated and matched to your record before granting access to the update form.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg border border-slateui-200">
              <p className="text-sm text-slateui-600 mb-4 text-center">
                Camera access required. Please allow camera permissions when prompted.
              </p>
              <div className="flex justify-center mb-4">
                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-slateui-300">
                  <QrCode className="h-32 w-32 text-slateui-300" />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => router.push("/")}
                className="btn-secondary flex-1"
                disabled={validating || validated}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => setShowScanner(true)}
                className="btn-primary flex-1"
                disabled={validating || validated}
              >
                {validating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : validated ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Validated
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Open Camera
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slateui-600">
            Need help?{" "}
            <a href="mailto:support@heirvault.com" className="text-gold-600 hover:text-gold-700 font-medium">
              Contact Support
            </a>
          </p>
        </div>
      </main>

      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => {
            setShowScanner(false);
            if (!validating && !validated) {
              setError(null);
            }
          }}
        />
      )}
    </div>
  );
}

