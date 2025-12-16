import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/utils/clerk";

export default async function RoleRouterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  if (user.role === "attorney" || user.role === "admin") {
    redirect("/dashboard");
  }

  redirect("/client-portal");
}
