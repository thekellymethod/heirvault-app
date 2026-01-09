// src/app/dashboard/policies/page.tsx
import PoliciesPageClient from "./page.client";

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  // Server wrapper only — client component owns fetching/pagination/UI.
  return <PoliciesPageClient />;
}
