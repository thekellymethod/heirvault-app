import "server-only";
import { requireAdmin } from "@/lib/auth/guards";
import SamplePDFsClient from "./SamplePDFsClient";

export const runtime = "nodejs";

export default async function SamplePDFsPage() {
  // Require admin authentication
  await requireAdmin();

  return <SamplePDFsClient />;
}

