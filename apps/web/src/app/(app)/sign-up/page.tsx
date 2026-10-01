import { redirect } from "next/navigation";

/** Sign-up and sign-in are the same passwordless step now. */
export default function SignUpPage() {
  redirect("/sign-in");
}
