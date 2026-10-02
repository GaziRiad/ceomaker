import "server-only";
import { getDb, saveDomainCheck, type SiteDomainRow } from "@ceomaker/db";
import type { DomainDiagnosis, DomainStage } from "@ceomaker/schema";
import { diagnoseDns, verificationFix } from "./dns";
import { lookupHosts } from "./lookup";
import type { DomainProvider } from "./provider";

export interface DomainCheckResult {
  stage: DomainStage;
  diagnosis: DomainDiagnosis;
  /** True when this check is the one that made the domain live. */
  wentLive: boolean;
}

const hostsOf = (row: Pick<SiteDomainRow, "domain" | "kind">) =>
  row.kind === "apex" ? [row.domain, `www.${row.domain}`] : [row.domain];

/**
 * Checks a domain against public DNS and the hosting provider and stores the outcome:
 * records → (owner says added) waiting → securing → connected. A domain whose records are right
 * before the owner says so goes ahead anyway. The caller has scoped the row to its owner.
 */
export async function checkDomain(
  row: SiteDomainRow,
  provider: DomainProvider,
): Promise<DomainCheckResult> {
  const [records, status] = await Promise.all([
    lookupHosts(hostsOf(row)),
    provider.status(row.domain, row.kind),
  ]);
  const expected = { a: row.aValue, cname: row.cnameValue };
  const dns = diagnoseDns({
    domain: row.domain,
    kind: row.kind,
    expected,
    records,
    confirmed: status.configured,
  });
  const verify = verificationFix(status.verification, row.domain);
  const diagnosis: DomainDiagnosis = { hosts: dns.hosts, fix: verify ?? dns.fix };
  const pointed = !verify && dns.hosts.every((host) => host.ok);

  let stage: DomainStage;
  if (row.stage === "connected") stage = "connected";
  else if (pointed) stage = (await provider.secured(row.domain)) ? "connected" : "securing";
  else stage = row.stage === "records" ? "records" : "waiting";

  const saved = await saveDomainCheck(getDb(), {
    siteId: row.siteId,
    domain: row.domain,
    stage,
    diagnosis,
  });
  return {
    stage: saved?.stage ?? stage,
    diagnosis,
    wentLive: row.stage !== "connected" && stage === "connected" && saved !== null,
  };
}
