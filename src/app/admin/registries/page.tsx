// Prisma removed - database access needs to be implemented
import AdminRegistriesTable from "./table";

export const dynamic = "force-dynamic";

export default async function AdminRegistriesPage() {
  const registries = await prisma.clientRegistry.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      files: { orderBy: { createdAt: "desc" } },
    },
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
