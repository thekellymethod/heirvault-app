import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/utils/clerk";

export default async function RoleRouterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/attorney/sign-in");

  // All accounts are attorney accounts - go to dashboard
  redirect("/dashboard");
}
