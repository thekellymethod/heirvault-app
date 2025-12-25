import UpdateForm from "./update-form";
import { verifyToken } from "@/lib/qr";
import { getRegistryById } from "@/lib/db";
import styles from "./page.module.css";

export default async function UpdateTokenPage({ params }: { params: { token: string } }) {
  const vt = verifyToken(params.token);

  if (!vt.valid || !vt.payload) {
    return (
      <main className={styles.main}>
        <h1>Access Denied</h1>
        <p>This update link is invalid or expired.</p>
      </main>
    );
  }

  const registry = await getRegistryById(vt.payload.registryId);
  if (!registry) {
    return (
      <main className={styles.main}>
        <h1>Not Found</h1>
        <p>The referenced registry record does not exist.</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1>Update Submission</h1>
      <p><strong>Decedent Name:</strong> {registry.decedentName}</p>

      <UpdateForm token={params.token} defaultInsured={registry.decedentName} defaultCarrier="" />
    </main>
  );
}
