import { redirect } from "next/navigation";

export default async function DashboardHomePage() {
  // The layout already handles authentication and role checks
  // Just redirect to the clients page
  redirect("/dashboard/clients");
}
