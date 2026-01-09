// Prisma removed - database access needs to be implemented
import AdminRegistriesTable from "./table";
import { findMany } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminRegistriesPage() {
  // Get registries using Supabase
  const registriesData = await findMany("registry_records", {
    orderBy: { column: "createdAt", ascending: false },
  });
  
  // Transform to expected format
  const registries = (registriesData || []).map((reg: Record<string, unknown>) => ({
    ...reg,
    files: [], // TODO: Fetch files separately if needed
  }));

  return (
    <div style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Admin – Registries</h1>
      <p style={{ opacity: 0.75, marginTop: 6 }}>
        View registries, uploaded files, and mark COMPLETE to generate the summary PDF.
      </p>

      <div style={{ marginTop: 18 }}>
        <AdminRegistriesTable registries={registries} />
      </div>
    </div>
  );
}
