import { verifyQRToken } from "@/lib/qr";
import { getRegistryById } from "@/lib/db";
import { redirect } from "next/navigation";
import { UpdateForm } from "./_components/UpdateForm";
import { Logo } from "@/components/Logo";
import { AlertCircle, Clock } from "lucide-react";

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * QR Update Page (Stateless Continuity)
 * Public route - no authentication required
 * 
 * Decode token
 * Validate expiry
 * Load registry metadata (read-only)
 * Allow update submission
 */
export default async function UpdatePage({ params }: Props) {
  const { token } = await params;

  // Decode and verify token
  const payload = verifyQRToken(token);
  
  if (!payload) {
    // Invalid or expired token
    redirect("/error?type=invalid_token");
  }

  // Validate expiry (already checked in verifyQRToken, but double-check)
  // Note: This is a server component, so Date.now() is safe
  const currentTime = new Date().getTime();
  if (currentTime > payload.expiresAt) {
    redirect("/error?type=expired_authorization");
  }

  // Load registry metadata (read-only)
  let registry;
  try {
    registry = await getRegistryById(payload.registryId);
  } catch (error) {
    console.error("Error loading registry:", error);
    redirect("/error?type=not_found");
  }

  // Get latest version data (read-only - for display only)
  const currentData = registry.latestVersion?.dataJson as Record<string, unknown> | undefined;

  // Calculate days until expiry
  const daysUntilExpiry = Math.ceil((payload.expiresAt - currentTime) / (1000 * 60 * 60 * 24));

  return (
    <main className="min-h-screen bg-paper-50 py-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="mb-8">
          <Logo size="sm" showTagline={false} className="flex-row" href="/" />
        </div>

        {/* Token expiry warning */}
        {daysUntilExpiry < 30 && (
          <div className="card p-4 mb-6 bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-700">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">
                This update link expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""}.
              </span>
            </div>
          </div>
        )}

        <div className="card p-6 mb-6">
          <h1 className="font-display text-2xl font-bold text-ink-900 mb-2">
            Update Policy Information
          </h1>
          <p className="text-slateui-600">
            Review your current information below. Submit changes to create a new version.
            <strong className="text-ink-900"> All changes are permanent and cannot be edited.</strong>
          </p>
        </div>

        {/* Current data display (read-only) */}
        {currentData && (
          <div className="card p-6 mb-6 bg-slateui-50 border-slateui-200">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-slateui-500" />
              Current Information (Read-Only)
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-ink-900">Decedent Name:</span>{" "}
                <span className="text-slateui-600">
                  {typeof currentData.decedentName === "string" ? currentData.decedentName : "Not provided"}
                </span>
              </div>
              {currentData.policyNumber ? (
                <div>
                  <span className="font-medium text-ink-900">Policy Number:</span>{" "}
                  <span className="text-slateui-600">
                    {String(currentData.policyNumber)}
                  </span>
                </div>
              ) : null}
              {currentData.policyType ? (
                <div>
                  <span className="font-medium text-ink-900">Policy Type:</span>{" "}
                  <span className="text-slateui-600">
                    {String(currentData.policyType)}
                  </span>
                </div>
              ) : null}
              {currentData.insurerName ? (
                <div>
                  <span className="font-medium text-ink-900">Insurance Company:</span>{" "}
                  <span className="text-slateui-600">
                    {String(currentData.insurerName)}
                  </span>
                </div>
              ) : null}
              {currentData.contactEmail ? (
                <div>
                  <span className="font-medium text-ink-900">Contact Email:</span>{" "}
                  <span className="text-slateui-600">
                    {String(currentData.contactEmail)}
                  </span>
                </div>
              ) : null}
              {currentData.contactPhone ? (
                <div>
                  <span className="font-medium text-ink-900">Contact Phone:</span>{" "}
                  <span className="text-slateui-600">
                    {String(currentData.contactPhone)}
                  </span>
                </div>
              ) : null}
            </div>
            <p className="text-xs text-slateui-500 mt-4">
              Last updated: {registry.latestVersion?.createdAt ? new Date(registry.latestVersion.createdAt).toLocaleString() : "Unknown"}
            </p>
          </div>
        )}

        {/* Update form */}
        <UpdateForm
          token={token}
          currentData={currentData}
          registryId={payload.registryId}
        />
      </div>
    </main>
  );
}
