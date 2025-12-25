import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Shield,
  XCircle,
  Clock,
  Key,
  AlertTriangle,
  Lock,
} from "lucide-react";

interface ErrorPageProps {
  searchParams: Promise<{
    type?: string,
    reason?: string,
  }>;
}

/**
 * Error / Access Denied Page
 * 
 * This page serves a defensive function. It prevents information leakage
 * while clearly explaining why access failed—expired authorization,
 * insufficient role, invalid QR token, or revoked credentials—without
 * revealing underlying data.
 */
export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams;
  const errorType = params.type || "access_denied";
  const reason = params.reason;

  // Map error types to display information
  const errorConfig = getErrorConfig(errorType, reason);

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo size="sm" showTagline={false} className="flex-row justify-center" href="/" />
        </div>

        <div className="card p-8 text-center">
          <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${errorConfig.iconBg}`}>
            {errorConfig.icon}
          </div>

          <h1 className="font-display text-2xl font-bold text-ink-900 mb-3">
            {errorConfig.title}
          </h1>

          <p className="text-slateui-600 mb-6">
            {errorConfig.message}
          </p>

          {errorConfig.details && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
              <p className="text-sm text-blue-900">
                {errorConfig.details}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="btn-primary px-6 py-3">
              Return to Home
            </Link>
            {errorConfig.showSignIn && (
              <Link href="/sign-in" className="btn-secondary px-6 py-3">
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slateui-500">
            If you believe this is an error, please contact your attorney or system administrator.
          </p>
        </div>
      </div>
    </main>
  );
}

function getErrorConfig(
  type: string,
  reason?: string
): {
  title: string,
  message: string,
  details?: string,
  icon: React.ReactNode;
  iconBg: string,
  showSignIn: boolean;
} {
  switch (type) {
    case "expired_authorization":
      return {
        title: "Authorization Expired",
        message: "Your authorization has expired. Please request a new access link from your attorney.",
        details: "Access links are time-limited for security purposes. Contact your attorney to receive a new invitation.",
        icon: <Clock className="h-10 w-10 text-amber-600" />,
        iconBg: "bg-amber-100",
        showSignIn: false,
      };

    case "insufficient_role":
      return {
        title: "Access Denied",
        message: "You do not have the required permissions to access this resource.",
        details: "This resource requires administrator privileges. If you need access, please contact your system administrator.",
        icon: <Shield className="h-10 w-10 text-red-600" />,
        iconBg: "bg-red-100",
        showSignIn: true,
      };

    case "invalid_token":
    case "invalid_qr":
      return {
        title: "Invalid Access Code",
        message: "The access code or QR code you used is invalid or has been revoked.",
        details: "Access codes may expire or be revoked for security reasons. Please contact your attorney for a new access link.",
        icon: <Key className="h-10 w-10 text-red-600" />,
        iconBg: "bg-red-100",
        showSignIn: false,
      };

    case "revoked_credentials":
      return {
        title: "Access Revoked",
        message: "Your access credentials have been revoked.",
        details: "If you believe this is an error, please contact your attorney or system administrator to restore access.",
        icon: <Lock className="h-10 w-10 text-red-600" />,
        iconBg: "bg-red-100",
        showSignIn: true,
      };

    case "unauthorized":
      return {
        title: "Unauthorized Access",
        message: "You must be signed in to access this resource.",
        details: "Please sign in with your attorney account to continue.",
        icon: <Shield className="h-10 w-10 text-blue-600" />,
        iconBg: "bg-blue-100",
        showSignIn: true,
      };

    case "forbidden":
      return {
        title: "Access Forbidden",
        message: "You do not have permission to access this resource.",
        details: "This resource is restricted. If you need access, please contact your attorney or system administrator.",
        icon: <AlertTriangle className="h-10 w-10 text-amber-600" />,
        iconBg: "bg-amber-100",
        showSignIn: true,
      };

    case "not_found":
      return {
        title: "Resource Not Found",
        message: "The requested resource could not be found.",
        details: "The link may be incorrect, or the resource may have been removed.",
        icon: <XCircle className="h-10 w-10 text-slateui-400" />,
        iconBg: "bg-slateui-100",
        showSignIn: false,
      };

    default:
      return {
        title: "Access Denied",
        message: "You do not have permission to access this resource.",
        details: reason
          ? undefined
          : "If you believe this is an error, please contact your attorney or system administrator.",
        icon: <Shield className="h-10 w-10 text-red-600" />,
        iconBg: "bg-red-100",
        showSignIn: true,
      };
  }
}

