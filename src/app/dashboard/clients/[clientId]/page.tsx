// src/app/dashboard/clients/[id]/page.tsx
import ClientPageClient from "./page.client";

export default function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  return <ClientPageClient params={params} />;
}

