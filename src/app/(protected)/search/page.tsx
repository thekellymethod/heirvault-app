import { requireAttorney } from "@/lib/auth";
import { SearchView } from "./_components/SearchView";

/**
 * Search & Discovery Page
 * Protected route - requires authentication
 * 
 * Server Component
 * Server action triggered
 * Require attorney
 * Require search purpose input
 * Query limited fields only
 * 
 * Never allow free-text global search. Ever.
 */
export default async function SearchPage() {
  // Require attorney authentication
  const user = await requireAttorney();

  return <SearchView user={user} />;
}
