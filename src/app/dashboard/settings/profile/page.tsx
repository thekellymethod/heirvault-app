import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/utils/clerk";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  // Clerk middleware handles authentication - no need for manual redirects
  await auth();

  // Use getCurrentUser to ensure user exists in database
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/dashboard");

  // Map to User interface expected by ProfileForm
  const user = {
    id: currentUser.id,
    firstName: currentUser.firstName,
    lastName: currentUser.lastName,
    email: currentUser.email,
    barNumber: currentUser.barNumber,
  };

  let organization: {
    id: string,
    name: string,
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    phone: string | null;
  } | null = null;

  // Same as org settings: queryRaw() requires RPC exec_raw_sql (not on default Supabase).
  const { findMany, findUnique } = await import("@/lib/db");
  type OrgMemberRow = { organization_id: string };
  const members = await findMany<OrgMemberRow>("org_members", {
    where: { userId: currentUser.id },
    limit: 1,
  });
  const member = members[0] ?? null;

  if (member) {
    type OrgRow = {
      id: string;
      name: string;
      address_line1: string | null;
      address_line2: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
      phone: string | null;
    };
    const org = await findUnique<OrgRow>("organizations", {
      id: member.organization_id,
    });
    if (org) {
      organization = {
        id: org.id,
        name: org.name,
        addressLine1: org.address_line1,
        addressLine2: org.address_line2,
        city: org.city,
        state: org.state,
        postalCode: org.postal_code,
        country: org.country,
        phone: org.phone,
      };
    }
  }

  return (
    <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900">Attorney Profile</h1>
            <p className="mt-2 text-base text-slateui-600">
              Manage your profile information and bar number.
            </p>
          </div>
          <a
            href="/dashboard"
            className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Return to Dashboard
          </a>
        </div>

        <ProfileForm user={user} organization={organization} />
      </div>
  );
}

