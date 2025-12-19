import { redirect } from "next/navigation";

// Only attorneys can create accounts - redirect to attorney sign-up
export default function SignUpPage() {
  redirect("/attorney/sign-up");
}

