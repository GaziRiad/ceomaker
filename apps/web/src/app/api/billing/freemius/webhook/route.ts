import { idToString } from "@freemius/sdk";
import { freemius, freemiusLicenseRemoved, syncFreemiusLicense } from "@/lib/freemius";

// Freemius's events (set under Settings › Webhooks), signed with the product's secret key. Each
// one makes us read the license again rather than trust the event: renewals, cancellations,
// refunds and expiry all come down to the license. A failure answers 500, so Freemius retries.

const LICENSE_EVENTS = [
  "license.created",
  "license.extended",
  "license.shortened",
  "license.updated",
  "license.cancelled",
  "license.expired",
  "license.plan.changed",
] as const;

export async function POST(request: Request) {
  const fs = freemius();
  if (!fs) return new Response("Not configured", { status: 404 });

  const listener = fs.webhook.createListener({
    onError: async (error) => console.error("Freemius webhook failed", error),
  });
  listener.on([...LICENSE_EVENTS], async ({ objects: { license } }) => {
    if (license?.id) await syncFreemiusLicense(idToString(license.id));
  });
  // When retries of a failed payment run out, the subscription stops after the license expired.
  listener.on("subscription.cancelled", async ({ objects: { license } }) => {
    if (license?.id) await syncFreemiusLicense(idToString(license.id));
  });
  listener.on("license.deleted", async ({ data }) => {
    await freemiusLicenseRemoved(idToString(data.license_id));
  });
  return fs.webhook.createRequestProcessor(listener)(request);
}
