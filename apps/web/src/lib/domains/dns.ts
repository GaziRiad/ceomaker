import type { DnsFixRow, DnsRecord, DomainDiagnosis, DomainKind } from "@ceomaker/schema";
import { recordName, registrableDomain } from "./input";

/** What public DNS says about one host right now. */
export interface HostRecords {
  a: string[];
  aaaa: string[];
  /** The CNAME target, if the host has one (lowercase, no trailing dot). */
  cname: string | null;
}

export interface ExpectedRecords {
  /** The IPv4 address the domain itself points at. */
  a: string;
  /** The hostname www (or a subdomain) points at. */
  cname: string;
}

const host = (value: string) => value.toLowerCase().replace(/\.$/, "");

/** The records the owner is asked to add for a domain. */
export function recordsFor(
  domain: string,
  kind: DomainKind,
  expected: ExpectedRecords,
): DnsRecord[] {
  const registrable = registrableDomain(domain);
  if (kind === "subdomain") {
    return [{ type: "CNAME", name: recordName(domain, registrable), value: expected.cname }];
  }
  return [
    { type: "A", name: "@", value: expected.a },
    { type: "CNAME", name: "www", value: expected.cname },
  ];
}

function pointsAtUs(records: HostRecords, expected: ExpectedRecords): boolean {
  if (records.cname && host(records.cname) === host(expected.cname)) return true;
  return records.a.length > 0 && records.a.every((ip) => ip === expected.a);
}

/**
 * Decides, from public DNS, which hosts already point at us and what (if anything) the owner
 * should change. `confirmed` lists hosts the hosting provider already serves correctly (it may
 * use addresses other than the one we show), which count as working whatever we see.
 */
export function diagnoseDns(input: {
  domain: string;
  kind: DomainKind;
  expected: ExpectedRecords;
  records: Record<string, HostRecords>;
  confirmed?: readonly string[];
}): DomainDiagnosis {
  const { domain, kind, expected, records } = input;
  const registrable = registrableDomain(domain);
  const empty: HostRecords = { a: [], aaaa: [], cname: null };
  const at = (name: string) => records[name] ?? empty;
  const confirmed = new Set(input.confirmed ?? []);
  const works = (name: string) => confirmed.has(name) || pointsAtUs(at(name), expected);
  const name = (target: string) => recordName(target, registrable);

  if (kind === "subdomain") {
    const found = at(domain);
    const ok = works(domain);
    const hosts = [{ name: domain, ok }];
    if (!ok && found.cname) {
      return {
        hosts,
        fix: {
          kind: "old",
          oldValue: found.cname,
          rows: [
            { action: "Delete", type: "CNAME", name: name(domain), value: found.cname },
            { action: "Add", type: "CNAME", name: name(domain), value: expected.cname },
          ],
        },
      };
    }
    return { hosts, fix: null };
  }

  const www = `www.${domain}`;
  const apex = at(domain);
  const apexOk = works(domain);
  const wwwOk = works(www);
  const hosts = [
    { name: www, ok: wwwOk },
    { name: domain, ok: apexOk },
  ];

  // Ours is there, but so is something else: visitors may land on either.
  const others: DnsFixRow[] = [
    ...apex.a
      .filter((ip) => ip !== expected.a)
      .map((ip): DnsFixRow => ({ action: "Delete", type: "A", name: "@", value: ip })),
    ...apex.aaaa.map((ip): DnsFixRow => ({ action: "Delete", type: "AAAA", name: "@", value: ip })),
  ];
  if (apex.a.includes(expected.a) && others.length > 0 && !confirmed.has(domain)) {
    return {
      hosts: hosts.map((entry) => (entry.name === domain ? { ...entry, ok: false } : entry)),
      fix: {
        kind: "old",
        oldValue: others[0]!.value,
        rows: [...others, { action: "Keep", type: "A", name: "@", value: expected.a }],
      },
    };
  }

  // One host works and the other still points somewhere else.
  if (wwwOk && !apexOk && apex.a.length > 0) {
    return {
      hosts,
      fix: {
        kind: "partial",
        working: www,
        broken: domain,
        rows: [{ action: "Add", type: "A", name: "@", value: expected.a }],
      },
    };
  }
  const wwwFound = at(www);
  if (apexOk && !wwwOk && (wwwFound.cname || wwwFound.a.length > 0)) {
    return {
      hosts,
      fix: {
        kind: "partial",
        working: domain,
        broken: www,
        rows: [{ action: "Add", type: "CNAME", name: "www", value: expected.cname }],
      },
    };
  }
  return { hosts, fix: null };
}

/** The extra TXT record a provider asks for when the domain is in use on another account. */
export function verificationFix(records: DnsRecord[], domain: string): DomainDiagnosis["fix"] {
  if (records.length === 0) return null;
  const registrable = registrableDomain(domain);
  return {
    kind: "verify",
    rows: records.map((record) => ({
      ...record,
      action: "Add" as const,
      name: recordName(host(record.name), registrable),
    })),
  };
}
