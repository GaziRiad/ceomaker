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

/**
 * Sends the passwordless sign-in link. Uses Resend's HTTP API directly (one request, no SDK).
 * In development without RESEND_API_KEY the link is printed to the server console instead;
 * production refuses to run without a key so links are never logged there.
 */
export async function sendSignInEmail(email: string, url: string): Promise<void> {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set, so sign-in emails can't be sent");
    }
    console.info(`\n[dev] Sign-in link for ${email}:\n${url}\n`);
    return;
  }

  const safeUrl = escapeHtml(url);
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM ?? "CEOMaker <onboarding@resend.dev>",
      to: [email],
      subject: "Your CEOMaker sign-in link",
      text: `Sign in to CEOMaker:\n\n${url}\n\nThe link works once and expires in 15 minutes. If you didn't ask for it, you can ignore this email.`,
      html: `<div style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1d1f20;max-width:480px">
<p style="font-size:20px;font-weight:600;letter-spacing:.02em;text-transform:uppercase">CEO<span style="color:#5980a6">Maker</span></p>
<p>Use this button to sign in. It works once and expires in 15 minutes.</p>
<p><a href="${safeUrl}" style="display:inline-block;background:#5980a6;color:#f2f2f3;padding:12px 18px;text-decoration:none;font-weight:600">Sign in to CEOMaker</a></p>
<p style="font-size:13px;color:#5d5d60">If the button doesn't work, paste this address into your browser:<br><span style="word-break:break-all">${safeUrl}</span></p>
<p style="font-size:13px;color:#5d5d60">If you didn't ask for this email, you can ignore it.</p>
</div>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(
      `Resend rejected the sign-in email (${response.status}): ${await response.text()}`,
    );
  }
}
