/**
 * Custom domains: the shape of a connection as it moves from "add these records" to live.
 * Shared by the database (stored on site_domain) and the app (shown in Settings).
 */

/**
 * - records: the owner has been shown the records to add.
 * - waiting: they say they've added them; we check DNS until it points at us.
 * - securing: DNS is right; the certificate (the padlock) is being issued.
 * - connected: the site is live on the domain.
 */
export const DOMAIN_STAGES = ["records", "waiting", "securing", "connected"] as const;
export type DomainStage = (typeof DOMAIN_STAGES)[number];

/**
 * - apex: ameliahart.com. An A record for the domain, plus a CNAME for www (which forwards).
 * - subdomain: me.ameliahart.com. One CNAME.
 */
export type DomainKind = "apex" | "subdomain";

export type DnsRecordType = "A" | "AAAA" | "CNAME" | "TXT";

/** A DNS record as the owner sees it at their provider: Name is relative to their domain. */
export interface DnsRecord {
  type: DnsRecordType;
  /** "@" for the domain itself, "www", or a label such as "_vercel". */
  name: string;
  value: string;
}

export type DnsFixAction = "Add" | "Delete" | "Keep";
export interface DnsFixRow extends DnsRecord {
  action: DnsFixAction;
}

/**
 * Something at the owner's DNS provider that stops the domain from working, with the exact
 * records to change. Checked automatically; shown in Settings.
 *
 * - old: an extra record still points at the previous host (delete it, keep ours).
 * - partial: one host points at us, the other still points somewhere else.
 * - verify: the domain is in use on another platform account; one TXT record proves it's theirs.
 */
export type DomainFix =
  | { kind: "old"; rows: DnsFixRow[]; oldValue: string }
  | { kind: "partial"; working: string; broken: string; rows: DnsFixRow[] }
  | { kind: "verify"; rows: DnsFixRow[] };

/** The latest check: each host we need and whether it points at us, plus anything to fix. */
export interface DomainDiagnosis {
  hosts: { name: string; ok: boolean }[];
  fix: DomainFix | null;
}

/** Unconnected claims expire, so nobody can hold a domain they never point at us. */
export const DOMAIN_CLAIM_DAYS = 7;
