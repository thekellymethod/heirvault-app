import { prisma } from "@/lib/db";
import { QRUpdateForm } from "./_components/QRUpdateForm";
import Link from "next/link";
import { XCircle, QrCode } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getOrCreateTestInvite } from "@/lib/test-invites";
import { lookupClientInvite } from "@/lib/invite-lookup";

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * QR Code Re-Submission / Update Page
 * 
 * This page allows policyholders to update their information by scanning
 * the QR code from their receipt. Each update creates a new version entry,
 * preserving the historical chain rather than overwriting data.
 * 
 * This page is accessible outside the system and doesn't require authentication.
 */
export default async function QRUpdatePage({ params }: Props) {
  const { token } = await params;

  // Try to get or create test invite first
  let invite: any = await getOrCreateTestInvite(token);

  // If not a test code, do normal lookup
  if (!invite) {
    invite = await lookupClientInvite(token);
  }

  if (!invite) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-paper-50 px-4 py-8">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="font-display text-xl font-bold text-ink-900 mb-2">Invalid QR Code</h1>
            <p className="text-sm text-slateui-600 mb-6">
              This QR code is invalid or has been revoked. Please contact your attorney for assistance.
            </p>
            <Link href="/" className="btn-primary inline-block">
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Get current client data with policies and beneficiaries
  const clientData = await prisma.$queryRawUnsafe<Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    date_of_birth: Date | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  }>>(`
    SELECT 
      id, first_name, last_name, email, phone, date_of_birth,
      address_line1, address_line2, city, state, postal_code, country
    FROM clients
    WHERE id = $1
    LIMIT 1
  `, invite.clientId);

  if (!clientData || clientData.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-paper-50 px-4 py-8">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="font-display text-xl font-bold text-ink-900 mb-2">Client Not Found</h1>
            <p className="text-sm text-slateui-600 mb-6">
              Unable to find client information. Please contact your attorney.
            </p>
            <Link href="/" className="btn-primary inline-block">
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const client = clientData[0];

  // Get current policies
  const policies = await prisma.$queryRawUnsafe<Array<{
    id: string;
    policy_number: string | null;
    policy_type: string | null;
    insurer_name: string;
  }>>(`
    SELECT 
      p.id,
      p.policy_number,
      p.policy_type,
      i.name as insurer_name
    FROM policies p
    INNER JOIN insurers i ON i.id = p.insurer_id
    WHERE p.client_id = $1
    ORDER BY p.created_at DESC
  `, invite.clientId);

  // Get current beneficiaries
  const beneficiaries = await prisma.$queryRawUnsafe<Array<{
    id: string;
    first_name: string;
    last_name: string;
    relationship: string | null;
    email: string | null;
    phone: string | null;
    date_of_birth: Date | null;
  }>>(`
    SELECT 
      id, first_name, last_name, relationship, email, phone, date_of_birth
    FROM beneficiaries
    WHERE client_id = $1
    ORDER BY created_at DESC
  `, invite.clientId);

  // Get version history count
  const versionCount = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
    SELECT COUNT(*)::int as count
    FROM client_versions
    WHERE client_id = $1
  `, invite.clientId);

  const versionNumber = (versionCount[0]?.count || 0) + 1;

  return (
    <main className="min-h-screen bg-paper-50 py-6 sm:py-12 overflow-x-hidden">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <Logo size="sm" showTagline={false} className="flex-row" href="/" />
          <Link
            href="/"
            className="text-sm font-medium text-slateui-600 hover:text-ink-900 transition"
          >
            Back to Home
          </Link>
        </div>

        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-100">
              <QrCode className="h-6 w-6 text-gold-600" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-ink-900">
                Update Your Information
              </h1>
              <p className="text-sm text-slateui-600">
                Submit changes or corrections to your policy information
              </p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Version {versionNumber}:</strong> This update will create a new version entry,
              preserving your complete history. Your previous information will remain accessible for reference.
            </p>
          </div>
        </div>

        <QRUpdateForm
          token={token}
          clientId={invite.clientId}
          currentData={{
            client: {
              firstName: client.first_name,
              lastName: client.last_name,
              email: client.email,
              phone: client.phone || "",
              dateOfBirth: client.date_of_birth 
                ? new Date(client.date_of_birth).toISOString().split("T")[0] 
                : "",
              addressLine1: client.address_line1 || "",
              addressLine2: client.address_line2 || "",
              city: client.city || "",
              state: client.state || "",
              postalCode: client.postal_code || "",
              country: client.country || "",
            },
            policies: policies.map(p => ({
              id: p.id,
              policyNumber: p.policy_number || "",
              policyType: p.policy_type || "",
              insurerName: p.insurer_name,
            })),
            beneficiaries: beneficiaries.map(b => ({
              id: b.id,
              firstName: b.first_name,
              lastName: b.last_name,
              relationship: b.relationship || "",
              email: b.email || "",
              phone: b.phone || "",
              dateOfBirth: b.date_of_birth 
                ? new Date(b.date_of_birth).toISOString().split("T")[0] 
                : "",
            })),
          }}
        />
      </div>
    </main>
  );
}

