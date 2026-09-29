import type { Metadata } from "next";
import { AuthForm } from "../auth-form";
import { AuthShell } from "../auth-shell";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your site.">
      <AuthForm mode="sign-in" />
    </AuthShell>
  );
}
