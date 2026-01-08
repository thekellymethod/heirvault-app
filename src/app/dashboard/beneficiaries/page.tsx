import BeneficiariesPageClient from "./page.client";

export const dynamic = "force-dynamic";

export default async function BeneficiariesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string, sort?: string }>;
}) {
  // This is now a wrapper that passes search params to the client component
  // The client component handles all the data fetching and pagination
  return <BeneficiariesPageClient />;
}
