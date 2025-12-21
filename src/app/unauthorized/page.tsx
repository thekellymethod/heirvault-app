import { redirect } from "next/navigation";

/**
 * Unauthorized Page
 * Redirects to centralized error page
 */
export default function UnauthorizedPage() {
  redirect("/error?type=unauthorized");
}

