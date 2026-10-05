// What leaves the browser is cleaned first. Our URLs can carry personal data: the guided
// answers travel in /start/finish?a=…, and /dns/<token> pages are private links. So our own URLs
// keep their path (ids and tokens masked) and campaign tags only, and other sites' URLs keep
// only their origin.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAMPAIGN_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

/** "/dashboard/sites/<uuid>/edit" → "/dashboard/sites/:id/edit"; "/dns/<token>" → "/dns/:token". */
export function scrubPath(path: string): string {
  const segments = path.split("/");
  return segments
    .map((segment, index) => {
      if (UUID.test(segment)) return ":id";
      if (segments[index - 1] === "dns" && index === 2 && segment) return ":token";
      return segment;
    })
    .join("/");
}

/** A URL safe to send. Values that aren't URLs ("$direct") pass through without a query. */
export function scrubUrl(value: string, ownHost: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value.split("?")[0] ?? "";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "";
  if (url.host !== ownHost) return `${url.origin}/`;
  const kept = new URLSearchParams();
  for (const name of CAMPAIGN_PARAMS) {
    const campaign = url.searchParams.get(name);
    if (campaign) kept.set(name, campaign.slice(0, 100));
  }
  const query = kept.toString();
  return `${url.origin}${scrubPath(url.pathname)}${query ? `?${query}` : ""}`;
}

type Properties = Record<string, unknown>;

function scrubProperties(properties: Properties | undefined, ownHost: string) {
  if (!properties) return;
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value !== "string") continue;
    if (key.endsWith("_url") || key.endsWith("referrer")) {
      properties[key] = scrubUrl(value, ownHost);
    } else if (key.endsWith("pathname")) {
      properties[key] = scrubPath(value);
    }
  }
  // Page titles can name the owner or their site.
  delete properties.title;
  delete properties.$title;
}

/** PostHog's before_send: cleans every event, and the person properties it carries. */
export function scrubEvent<
  T extends { properties: Properties; $set?: Properties; $set_once?: Properties },
>(event: T | null, ownHost: string): T | null {
  if (!event) return null;
  scrubProperties(event.properties, ownHost);
  scrubProperties(event.$set, ownHost);
  scrubProperties(event.$set_once, ownHost);
  return event;
}
