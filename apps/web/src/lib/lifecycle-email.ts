import "server-only";
import { after } from "next/server";
import { draftCardUrl } from "./draft-card";
import { serverEnv } from "./env";
import { SHARE_CARD_PATH } from "./share-card";

// The onboarding emails (welcome, "one step from live", "need a hand?", "you're live") are an
// Automation in Resend's dashboard, with templates edited there. The app only tells Resend what
// happened: an account signed up (which also makes it a contact), its first site went live, or
// the account was deleted (which removes the contact). Off without RESEND_API_KEY.

const RESEND_API = "https://api.resend.com";
const TIMEOUT_MS = 5000;

/** Event names, as the Automation's trigger and wait steps expect them. */
export const LIFECYCLE_EVENTS = {
  signedUp: "user.signed_up",
  firstPublished: "site.first_published",
} as const;

async function resend(method: "POST" | "DELETE", path: string, body?: unknown): Promise<void> {
  const key = serverEnv().RESEND_API_KEY;
  if (!key) return;
  const response = await fetch(`${RESEND_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // A contact that's already there (or already gone) is what we wanted anyway.
  if (
    !response.ok &&
    response.status !== 409 &&
    !(method === "DELETE" && response.status === 404)
  ) {
    throw new Error(
      `Resend ${method} ${path} failed (${response.status}): ${await response.text()}`,
    );
  }
}

/** Runs after the response has gone and never throws: these emails never break the app. */
function later(task: () => Promise<void>): void {
  const run = () =>
    task().catch((error) => console.error("Updating Resend for lifecycle emails failed", error));
  try {
    after(run);
  } catch {
    void run();
  }
}

/** The first word of the account's name, if it has one (sign-in by email leaves it empty). */
export function firstName(name: string | null | undefined): string | undefined {
  return name?.trim().split(/\s+/)[0] || undefined;
}

/** A new account: becomes a contact, then starts the onboarding Automation. */
export function lifecycleSignedUp(user: { id: string; email: string; name?: string | null }): void {
  later(async () => {
    // An address that is already a contact (an account deleted and made again) still gets the
    // event, so a failure here is only logged.
    await resend("POST", "/contacts", {
      email: user.email,
      first_name: firstName(user.name),
    }).catch((error) => console.error("Creating the Resend contact failed", error));
    await resend("POST", "/events/send", {
      event: LIFECYCLE_EVENTS.signedUp,
      email: user.email,
      // The welcome email's picture of the draft (the draft is written after sign-up, so the
      // Automation waits before sending it).
      payload: { draft_card_url: draftCardUrl(user.id) },
    });
  });
}

/** The account's first site went live: ends the reminders and sends "you're live". */
export function lifecycleFirstPublished(email: string, siteUrl: string, versionId: string): void {
  later(() =>
    resend("POST", "/events/send", {
      event: LIFECYCLE_EVENTS.firstPublished,
      email,
      payload: {
        site_url: siteUrl,
        site_address: new URL(siteUrl).host,
        // The site's share image, as LinkedIn shows it; the version keeps caches honest.
        card_url: `${siteUrl}${SHARE_CARD_PATH}?v=${versionId.slice(0, 12)}`,
        share_url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}`,
      },
    }),
  );
}

/** A deleted account leaves no contact behind. */
export function lifecycleAccountDeleted(email: string): void {
  later(() => resend("DELETE", `/contacts/${encodeURIComponent(email)}`));
}
