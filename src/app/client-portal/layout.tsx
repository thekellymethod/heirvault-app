import { ReactNode } from "react";
import { redirect } from "next/navigation";

// Clients don't need accounts - they access via invitation links
// Redirect to home page with message about using invitation links
export default async function ClientPortalLayout({ children }: { children: ReactNode }) {
  redirect("/");
}
