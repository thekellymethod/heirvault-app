import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
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
  
  try {
    // Try raw SQL first - it's more reliable when Prisma client is broken
    const rawResult = await prisma.$queryRaw<Array<{
      organization_id: string,
      org_name: string,
      address_line1: string | null;
      address_line2: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
      phone: string | null;
    }>>`
      SELECT 
        o.id as organization_id,
        o.name as org_name,
        o.address_line1,
        o.address_line2,
        o.city,
        o.state,
        o.postal_code,
        o.country,
        o.phone
      FROM org_members om
      INNER JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = ${currentUser.id}
      LIMIT 1
    `;
    
    if (rawResult && rawResult.length > 0) {
      const row = rawResult[0];
      organization = {
        id: row.organization_id,
        name: row.org_name,
        addressLine1: row.address_line1,
        addressLine2: row.address_line2,
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        country: row.country,
        phone: row.phone,
      };
    }
  } catch (sqlError: unknown) {
    const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
    console.error("Profile page: Raw SQL failed:", sqlErrorMessage);
    // If query fails, redirect to dashboard
    redirect("/dashboard");
  }

  if (!currentUser) redirect("/dashboard");

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

