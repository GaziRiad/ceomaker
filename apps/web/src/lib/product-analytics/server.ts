import "server-only";
import { after } from "next/server";
import { PostHog } from "posthog-node";
import { POSTHOG_API_HOST, posthogKey } from "./config";
import { scrubPath } from "./scrub";
import type { VisitSource } from "./visit-source";

// Product events sent from the server, with the account id as the person: they can't be blocked
// and they carry nothing personal (no email, no site content). Off without NEXT_PUBLIC_POSTHOG_KEY.

type Value = string | number | boolean | null;

export type ProductEvent =
  | "signed_up"
  | "site_created"
  | "draft_written"
  | "template_chosen"
  | "site_published"
  | "ai_rewrite_used"
  | "photo_uploaded"
  | "domain_added"
  | "device_preview_changed"
  | "checkout_started"
  | "plan_changed";

const TIMEOUT_MS = 2000;
let client: PostHog | null | undefined;

function posthogClient(): PostHog | null {
  if (client === undefined) {
    const key = posthogKey();
    client = key
      ? new PostHog(key, {
          host: POSTHOG_API_HOST,
          flushAt: 1,
          flushInterval: 0,
          requestTimeout: TIMEOUT_MS,
          fetchRetryCount: 1,
          // The server's own location says nothing about the person.
          disableGeoip: true,
        })
      : null;
  }
  return client;
}

/** Waits for a send at most TIMEOUT_MS, and never throws: analytics never breaks the app. */
async function settle(send: () => Promise<void>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      send(),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    console.error("Sending a product analytics event failed", error);
  } finally {
    clearTimeout(timer);
  }
}

/** Sends an event once the response has gone, so it never slows down what the person did. */
export function trackServerEvent(
  userId: string,
  event: ProductEvent,
  properties: Record<string, Value> = {},
): void {
  const posthog = posthogClient();
  if (!posthog) return;
  const send = () =>
    settle(() => posthog.captureImmediate({ distinctId: userId, event, properties }));
  try {
    after(send);
  } catch {
    // Outside a request (a script): send now instead.
    void send();
  }
}

/** The same, waited for: inside a streamed response, which keeps the request open itself. */
export async function sendServerEvent(
  userId: string,
  event: ProductEvent,
  properties: Record<string, Value> = {},
): Promise<void> {
  const posthog = posthogClient();
  if (posthog)
    await settle(() => posthog.captureImmediate({ distinctId: userId, event, properties }));
}

function compact(values: Record<string, Value>): Record<string, string | boolean> {
  const kept: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== "") kept[key] = value as string | boolean;
  }
  return kept;
}

/**
 * A new account: joins the visit that led to it (`anonymousId`, its questions and sign-in steps)
 * to the account, records where it came from on the person, and counts the sign-up. The join
 * is sent before the browser's own, so the visit's source is the one the person keeps.
 */
export async function recordSignup(input: {
  userId: string;
  anonymousId: string | null;
  source: VisitSource;
  fromStart: boolean;
}): Promise<void> {
  const posthog = posthogClient();
  if (!posthog) return;
  const { source } = input;
  const properties = {
    source: source.source,
    referrer_host: source.referrerHost,
    utm_source: source.utmSource,
    utm_medium: source.utmMedium,
    utm_campaign: source.utmCampaign,
    landing_path: source.landingPath,
  };
  const person = compact({
    ...Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [`signup_${key}`, value]),
    ),
    $initial_referring_domain: source.referrerHost ?? "$direct",
    $initial_utm_source: source.utmSource,
    $initial_utm_medium: source.utmMedium,
    $initial_utm_campaign: source.utmCampaign,
    $initial_pathname: source.landingPath,
  });
  await settle(() =>
    posthog.identifyImmediate({
      distinctId: input.userId,
      properties: {
        $set_once: person,
        ...(input.anonymousId ? { $anon_distinct_id: input.anonymousId } : {}),
      },
    }),
  );
  trackServerEvent(input.userId, "signed_up", { ...properties, from_start: input.fromStart });
}

/** A server error (see instrumentation.ts): where it happened, never who or what was sent. */
export async function reportServerError(
  error: unknown,
  request: { path: string; method: string },
  context: { routePath: string; routeType: string },
): Promise<void> {
  const posthog = posthogClient();
  if (!posthog) return;
  await settle(() =>
    posthog.captureExceptionImmediate(error, undefined, {
      path: scrubPath(request.path.split("?")[0] ?? ""),
      method: request.method,
      route: context.routePath,
      route_type: context.routeType,
    }),
  );
}
