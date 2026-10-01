import { z } from "zod";

/**
 * Subdomains we must never hand to a customer: our own infrastructure, auth- and billing-looking
 * names that enable phishing, and generic names that look official.
 */
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  "about",
  "account",
  "accounts",
  "admin",
  "administrator",
  "api",
  "app",
  "apps",
  "assets",
  "auth",
  "autoconfig",
  "autodiscover",
  "beta",
  "billing",
  "blog",
  "cdn",
  "ceo",
  "ceomaker",
  "checkout",
  "dashboard",
  "dev",
  "docs",
  "domains",
  "download",
  "email",
  "files",
  "ftp",
  "help",
  "images",
  "img",
  "imap",
  "internal",
  "invoice",
  "invoices",
  "jobs",
  "careers",
  "legal",
  "localhost",
  "login",
  "logout",
  "mail",
  "manage",
  "media",
  "mobile",
  "mx",
  "news",
  "ns1",
  "ns2",
  "oauth",
  "official",
  "pay",
  "payment",
  "payments",
  "pop",
  "pop3",
  "press",
  "preview",
  "privacy",
  "register",
  "root",
  "secure",
  "security",
  "settings",
  "signin",
  "signup",
  "smtp",
  "sso",
  "staging",
  "static",
  "status",
  "store",
  "support",
  "system",
  "team",
  "terms",
  "test",
  "verify",
  "webmail",
  "www",
]);

export const SUBDOMAIN_MIN_LENGTH = 3;
export const SUBDOMAIN_MAX_LENGTH = 40;

export const subdomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(SUBDOMAIN_MIN_LENGTH, `Must be at least ${SUBDOMAIN_MIN_LENGTH} characters`)
  .max(SUBDOMAIN_MAX_LENGTH, `Must be at most ${SUBDOMAIN_MAX_LENGTH} characters`)
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    "Use lowercase letters, digits and hyphens, not starting or ending with a hyphen",
  )
  // Blocks punycode ("xn--") lookalikes of other names, and ugly double hyphens generally.
  .refine((value) => !value.includes("--"), "Must not contain consecutive hyphens")
  .refine((value) => !RESERVED_SUBDOMAINS.has(value), "This name is reserved");

/** Fast boolean check used on the hot request path. */
export function isValidSubdomain(value: string): boolean {
  return subdomainSchema.safeParse(value).success && value === value.toLowerCase().trim();
}

function slugWords(name: string): string[] {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Addresses to try for a new site, best first: "amelia", "amelia-hart", "ameliahart",
 * then numbered variants. Every candidate passes subdomain validation. Names with no Latin
 * letters (e.g. Arabic or Chinese script) yield nothing; callers fall back to a random name.
 */
export function suggestSubdomains(name: string): string[] {
  const words = slugWords(name);
  const first = words[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1]! : "";
  const full = words.join("-").slice(0, SUBDOMAIN_MAX_LENGTH).replace(/-+$/, "");
  const base = last ? `${first}-${last}` : first;
  const candidates = [first, base, full, last ? `${first}${last}` : ""];
  for (let n = 2; n <= 9; n += 1) candidates.push(`${base}-${n}`);
  return [...new Set(candidates)].filter(isValidSubdomain);
}

/** Last resort when every suggestion is taken: "amelia-hart-x7k2" or "site-x7k2q9". */
export function randomSubdomain(name: string, random: () => number = Math.random): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const suffix = (length: number) =>
    Array.from({ length }, () => alphabet[Math.floor(random() * alphabet.length)]).join("");
  const [suggestion] = suggestSubdomains(name);
  const candidate = suggestion ? `${suggestion.slice(0, 30)}-${suffix(4)}` : `site-${suffix(6)}`;
  return isValidSubdomain(candidate) ? candidate : `site-${suffix(6)}`;
}
