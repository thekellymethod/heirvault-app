import { redirect } from "next/navigation";

/**
 * Forbidden Page
 * Redirects to centralized error page
 */
export default function ForbiddenPage() {
  redirect("/error?type=forbidden");
}

