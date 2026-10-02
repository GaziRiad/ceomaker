import type { DomainKind } from "@ceomaker/schema";
import { parse } from "tldts";

export type DomainInput =
  | { ok: true; domain: string; kind: DomainKind; registrable: string }
  | { ok: false; error: string };

/**
 * Reads what an owner typed ("https://www.AmeliaHart.com/about", "ameliahart.com") into the
 * domain to connect. www is dropped: the www host comes with an apex domain automatically.
 * International names are stored in their ASCII (punycode) form.
 */
export function parseDomainInput(raw: string, ourHosts: readonly string[]): DomainInput {
  const typed = raw.trim().toLowerCase();
  if (!typed) return { ok: false, error: "Enter your domain, like ameliahart.com." };
  const notADomain: DomainInput = {
    ok: false,
    error: "That doesn't look like a domain. Try something like ameliahart.com.",
  };

  let hostname: string;
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(typed) ? typed : `http://${typed}`;
    const url = new URL(withScheme);
    if (url.username || url.password || url.port) return notADomain;
    hostname = url.hostname.replace(/\.$/, "");
  } catch {
    return notADomain;
  }
  if (hostname.startsWith("www.")) hostname = hostname.slice(4);

  const info = parse(hostname);
  if (
    info.isIp ||
    !info.domain ||
    !info.isIcann ||
    hostname.length > 253 ||
    !/^[a-z0-9.-]+$/.test(hostname) ||
    hostname.split(".").some((label) => !label || label.length > 63 || /^-|-$/.test(label))
  ) {
    return notADomain;
  }
  if (ourHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    return {
      ok: false,
      error: "That's already your CEOMaker address. Enter a domain you own.",
    };
  }
  return {
    ok: true,
    domain: hostname,
    kind: hostname === info.domain ? "apex" : "subdomain",
    registrable: info.domain,
  };
}

/** The name to type at the DNS provider for a host: "@" for the domain itself, else its label. */
export function recordName(host: string, registrable: string): string {
  if (host === registrable) return "@";
  return host.endsWith(`.${registrable}`) ? host.slice(0, -(registrable.length + 1)) : host;
}

/** The registrable domain (where the owner manages DNS) of a host. */
export function registrableDomain(host: string): string {
  return parse(host).domain ?? host;
}
