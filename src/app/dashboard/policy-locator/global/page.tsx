import { redirect } from "next/navigation";

export default function GlobalPolicyLocatorRedirect() {
  redirect("/dashboard/policy-locator");
}
