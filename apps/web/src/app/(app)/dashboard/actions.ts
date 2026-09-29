"use server";

import {
  createSite,
  getDb,
  InvalidSiteDataError,
  listSitesForUser,
  SubdomainTakenError,
} from "@ceomaker/db";
import { createStarterSiteContent, defaultTheme, subdomainSchema } from "@ceomaker/schema";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export interface ClaimSiteState {
  error?: string;
  subdomain?: string;
}

/** Claims a subdomain and creates a draft site. Every server action re-checks the session. */
export async function claimSite(
  _previous: ClaimSiteState,
  formData: FormData,
): Promise<ClaimSiteState> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const raw = String(formData.get("subdomain") ?? "").slice(0, 100);
  const subdomain = subdomainSchema.safeParse(raw);
  if (!subdomain.success) {
    return {
      error: subdomain.error.issues[0]?.message ?? "That address is not valid.",
      subdomain: raw,
    };
  }

  const db = getDb();
  if ((await listSitesForUser(db, session.user.id)).length > 0) {
    return { error: "Your account already has a site." };
  }

  try {
    await createSite(db, {
      userId: session.user.id,
      subdomain: subdomain.data,
      templateKey: "executive",
      theme: defaultTheme,
      content: createStarterSiteContent(session.user.name),
    });
  } catch (error) {
    if (error instanceof SubdomainTakenError) {
      return { error: "That address is taken. Try another.", subdomain: raw };
    }
    if (error instanceof InvalidSiteDataError) {
      return { error: "We could not create your site. Please contact support.", subdomain: raw };
    }
    throw error;
  }

  redirect("/dashboard");
}
