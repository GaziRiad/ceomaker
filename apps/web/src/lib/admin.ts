import "server-only";
import { notFound } from "next/navigation";
import { getSession } from "./auth";
import { serverEnv } from "./env";

// The admin page is for the people listed in ADMIN_EMAILS. Everyone else sees a not-found page,
// so it doesn't reveal the page exists. Every admin action checks again on the server.

/** The listed emails, lowercased. Commas, semicolons or spaces separate them. */
export function adminEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** A listed email that the account has proven it owns (magic link and Google both do). */
export function isAdmin(
  user: { email: string; emailVerified: boolean },
  emails: Set<string> = adminEmails(serverEnv().ADMIN_EMAILS),
): boolean {
  return user.emailVerified && emails.has(user.email.trim().toLowerCase());
}

/** The signed-in admin's session, or null for anyone else. For server actions. */
export async function adminSession() {
  const session = await getSession();
  return session && isAdmin(session.user) ? session : null;
}

/** The signed-in admin's session; anyone else sees the page as not found. */
export async function requireAdmin() {
  const session = await adminSession();
  if (!session) notFound();
  return session;
}
