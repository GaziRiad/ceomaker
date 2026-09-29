import type { Metadata } from "next";
import { AuthForm } from "../auth-form";
import { AuthShell } from "../auth-shell";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to build and preview. Pay when you publish."
    >
      <AuthForm mode="sign-up" />
    </AuthShell>
  );
}
