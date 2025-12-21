import UpdateForm from "./update-form";
import { verifyToken } from "@/lib/qr";
import { getRegistryById } from "@/lib/db";

export default async function UpdateTokenPage({ params }: { params: { token: string } }) {
  const vt = verifyToken(params.token);

  if (!vt.valid || !vt.payload) {
    return (
      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <h1>Access Denied</h1>
        <p>This update link is invalid or expired.</p>
      </main>
    );
  }

  const registry = await getRegistryById(vt.payload.registryId);
  if (!registry) {
    return (
      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <h1>Not Found</h1>
        <p>The referenced registry record does not exist.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Update Submission</h1>
      <p><strong>Insured:</strong> {registry.insured_name}</p>
      <p><strong>Carrier:</strong> {registry.carrier_guess ?? "—"}</p>

      <UpdateForm token={params.token} defaultInsured={registry.insured_name} defaultCarrier={registry.carrier_guess ?? ""} />
    </main>
  );
}
