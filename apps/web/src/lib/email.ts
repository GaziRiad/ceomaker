import "server-only";
import { serverEnv } from "./env";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** True when emails really go out (a Resend key is set). */
export function emailConfigured(): boolean {
  return Boolean(serverEnv().RESEND_API_KEY);
}

/** True when a flow that needs an email can run: really sent, or printed in development. */
export function canSendEmail(): boolean {
  return emailConfigured() || process.env.NODE_ENV !== "production";
}

interface LinkEmail {
  to: string;
  subject: string;
  /** One or two sentences above the button. */
  intro: string;
  button: string;
  url: string;
  /** Under the button, e.g. "If you didn't ask for this email, you can ignore it." */
  footnote: string;
}

/**
 * Sends a short email with one button. Uses Resend's HTTP API directly (one request, no SDK).
 * In development without RESEND_API_KEY the link is printed to the server console instead;
 * production refuses to run without a key so links are never logged there.
 */
async function sendLinkEmail(email: LinkEmail): Promise<void> {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set, so emails can't be sent");
    }
    console.info(`\n[dev] ${email.subject} for ${email.to}:\n${email.url}\n`);
    return;
  }

  const safeUrl = escapeHtml(email.url);
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM ?? "CEOMaker <onboarding@resend.dev>",
      to: [email.to],
      subject: email.subject,
      text: `${email.intro}\n\n${email.url}\n\n${email.footnote}`,
      html: `<div style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1d1f20;max-width:480px">
<p style="font-size:20px;font-weight:600;letter-spacing:.02em;text-transform:uppercase">CEO<span style="color:#5980a6">Maker</span></p>
<p>${escapeHtml(email.intro)}</p>
<p><a href="${safeUrl}" style="display:inline-block;background:#5980a6;color:#f2f2f3;padding:12px 18px;text-decoration:none;font-weight:600">${escapeHtml(email.button)}</a></p>
<p style="font-size:13px;color:#5d5d60">If the button doesn't work, paste this address into your browser:<br><span style="word-break:break-all">${safeUrl}</span></p>
<p style="font-size:13px;color:#5d5d60">${escapeHtml(email.footnote)}</p>
</div>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(
      `Resend rejected "${email.subject}" (${response.status}): ${await response.text()}`,
    );
  }
}

/** The passwordless sign-in link. */
export async function sendSignInEmail(email: string, url: string): Promise<void> {
  await sendLinkEmail({
    to: email,
    subject: "Your CEOMaker sign-in link",
    intro: "Use this button to sign in. It works once and expires in 15 minutes.",
    button: "Sign in to CEOMaker",
    url,
    footnote: "If you didn't ask for this email, you can ignore it.",
  });
}

/** Confirms a new address before it replaces the old one (sent to the new address). */
export async function sendEmailChangeLink(email: string, url: string): Promise<void> {
  await sendLinkEmail({
    to: email,
    subject: "Confirm your new CEOMaker email",
    intro:
      "Open this link to use this address for your CEOMaker account. It works for 24 hours; until then, nothing changes.",
    button: "Confirm this email",
    url,
    footnote: "If you didn't ask to change your email, you can ignore this one.",
  });
}

/** Tells a site owner someone wrote through their contact form. */
export async function sendMessageNotification(input: {
  to: string;
  sender: string;
  topic: string;
  url: string;
}): Promise<void> {
  const about = input.topic ? ` about ${input.topic.toLowerCase()}` : "";
  await sendLinkEmail({
    to: input.to,
    subject: `New message from ${input.sender}`,
    intro: `${input.sender} wrote to you${about} through your site. Read it and reply from your dashboard.`,
    button: "Read the message",
    url: input.url,
    footnote: "You can turn these emails off in Settings, under Site.",
  });
}

/** Tells an owner their own domain is live. */
export async function sendDomainLiveEmail(input: { to: string; domain: string }): Promise<void> {
  if (!emailConfigured() && process.env.NODE_ENV === "production") return;
  await sendLinkEmail({
    to: input.to,
    subject: `${input.domain} is live`,
    intro: `Your site now opens at ${input.domain}, with the secure padlock. Your CEOMaker address forwards there, so links you've already shared keep working.`,
    button: `Open ${input.domain}`,
    url: `https://${input.domain}`,
    footnote: "You can manage the domain in Settings, under Site.",
  });
}
