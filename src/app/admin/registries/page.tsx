// Prisma removed - database access needs to be implemented
import AdminRegistriesTable from "./table";
import { findMany } from "@/lib/db";

export const dynamic = "force-dynamic";

type RegistryWithFiles = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  clientEmail: string;
  clientName: string | null;
  status: string;
  completedAt: Date | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  summaryBucket: string | null;
  summaryPath: string | null;
  files: Array<{
    id: string;
    createdAt: Date;
    registryId: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number | null;
    storageBucket: string;
    storagePath: string;
    status: string;
  }>;
};

export default async function AdminRegistriesPage() {
  // Get registries using Supabase
  const registriesData = await findMany("registry_records", {
    orderBy: { column: "createdAt", ascending: false },
  });
  
  // Transform to expected format
  const registries: RegistryWithFiles[] = (registriesData || []).map((reg: unknown) => {
    const r = reg as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(String(r.createdAt ?? "")),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt : new Date(String(r.updatedAt ?? "")),
      clientEmail: String(r.clientEmail ?? ""),
      clientName: r.clientName ? String(r.clientName) : null,
      status: String(r.status ?? ""),
      completedAt: r.completedAt ? (r.completedAt instanceof Date ? r.completedAt : new Date(String(r.completedAt))) : null,
      stripeCheckoutSessionId: r.stripeCheckoutSessionId ? String(r.stripeCheckoutSessionId) : null,
      stripePaymentIntentId: r.stripePaymentIntentId ? String(r.stripePaymentIntentId) : null,
      summaryBucket: r.summaryBucket ? String(r.summaryBucket) : null,
      summaryPath: r.summaryPath ? String(r.summaryPath) : null,
      files: [], // TODO: Fetch files separately if needed
    };
  });

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
