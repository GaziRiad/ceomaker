import "server-only";
import {
  claimSiteDomain,
  DomainTakenError,
  getDb,
  getSiteDomain,
  markDomainRecordsAdded,
  removeSiteDomain,
  SiteNotFoundError,
  type SiteDomainRow,
} from "@ceomaker/db";
import type { DnsRecord, DomainDiagnosis, DomainKind, DomainStage } from "@ceomaker/schema";
import { randomBytes } from "node:crypto";
import { forgetDomainRouting } from "../domain-routing";
import { sendDomainLiveEmail } from "../email";
import { appUrl, routingConfigFromEnv } from "../routing";
import { checkDomain } from "./check";
import { recordsFor } from "./dns";
import { parseDomainInput, registrableDomain } from "./input";
import { domainProvider, type DomainProvider } from "./provider";

/** What Settings shows about a site's domain. Plain data, safe to send to the browser. */
export interface DomainView {
  domain: string;
  kind: DomainKind;
  /** Where the owner manages DNS: the registrable domain (ameliahart.com for me.ameliahart.com). */
  zone: string;
  stage: DomainStage;
  records: DnsRecord[];
  diagnosis: DomainDiagnosis | null;
  checkedAt: string | null;
  shareToken: string;
}

export type DomainResult = { ok: true; view: DomainView | null } | { ok: false; error: string };

export const DOMAINS_UNAVAILABLE = "Custom domains aren't available yet.";

/** Purges cached pages of a site; updateTag in actions, revalidateTag elsewhere. */
type Invalidate = (subdomain: string) => void;

export function toDomainView(row: SiteDomainRow): DomainView {
  return {
    domain: row.domain,
    kind: row.kind,
    zone: registrableDomain(row.domain),
    stage: row.stage,
    records: recordsFor(row.domain, row.kind, { a: row.aValue, cname: row.cnameValue }),
    diagnosis: row.diagnosis,
    checkedAt: row.checkedAt?.toISOString() ?? null,
    shareToken: row.shareToken,
  };
}

/** Hosts that are ours and can't be connected as a customer domain. */
function ourHosts(): string[] {
  const routing = routingConfigFromEnv();
  const hosts = [new URL(appUrl()).hostname, "vercel.app", "vercel-dns.com"];
  if (routing.mode === "subdomain") hosts.push(routing.rootDomain.split(":")[0]!);
  return hosts;
}

/** Removes a domain from the hosting side. Logged, never thrown: the database is the truth. */
export async function releaseFromProvider(
  domain: { domain: string; kind: DomainKind },
  provider: DomainProvider | null = domainProvider(),
): Promise<void> {
  if (!provider) return;
  try {
    await provider.remove(domain.domain, domain.kind);
  } catch (error) {
    console.error(`Couldn't remove ${domain.domain} from the host`, error);
  }
}

/** Starts connecting a domain to a site the user owns, replacing any previous one. */
export async function connectDomain(input: {
  userId: string;
  siteId: string;
  subdomain: string;
  raw: string;
  invalidate: Invalidate;
}): Promise<DomainResult> {
  const provider = domainProvider();
  if (!provider) return { ok: false, error: DOMAINS_UNAVAILABLE };
  const parsed = parseDomainInput(input.raw, ourHosts());
  if (!parsed.ok) return parsed;

  const db = getDb();
  const previous = await getSiteDomain(db, { userId: input.userId, siteId: input.siteId });
  if (previous?.domain === parsed.domain) return { ok: true, view: toDomainView(previous) };

  let row: SiteDomainRow;
  try {
    const targets = await provider.targets(parsed.domain);
    row = await claimSiteDomain(db, {
      userId: input.userId,
      siteId: input.siteId,
      domain: parsed.domain,
      kind: parsed.kind,
      aValue: targets.a,
      cnameValue: targets.cname,
      shareToken: randomBytes(9).toString("base64url"),
    });
  } catch (error) {
    if (error instanceof DomainTakenError) {
      return {
        ok: false,
        error: `${parsed.domain} is already connected to another CEOMaker site. If it's yours, contact us and we'll sort it out.`,
      };
    }
    if (error instanceof SiteNotFoundError)
      return { ok: false, error: "This site no longer exists." };
    throw error;
  }
  if (previous) {
    await releaseFromProvider(previous, provider);
    forgetDomainRouting();
    input.invalidate(input.subdomain);
  }

  try {
    await provider.add(row.domain, row.kind);
  } catch (error) {
    console.error(`Couldn't add ${row.domain} to the host`, error);
    await removeSiteDomain(db, { userId: input.userId, siteId: input.siteId });
    return {
      ok: false,
      error: `We couldn't add ${row.domain}. If it's connected to another website service, remove it there first, then try again.`,
    };
  }
  return { ok: true, view: toDomainView(row) };
}

/** Checks a site's domain now and handles it going live. */
export async function checkSiteDomain(input: {
  row: SiteDomainRow;
  subdomain: string;
  owner: { email: string };
  invalidate: Invalidate;
}): Promise<DomainView> {
  const provider = domainProvider();
  if (!provider || input.row.stage === "connected") return toDomainView(input.row);
  const result = await checkDomain(input.row, provider);
  if (result.wentLive) {
    forgetDomainRouting();
    input.invalidate(input.subdomain);
    try {
      await sendDomainLiveEmail({ to: input.owner.email, domain: input.row.domain });
    } catch (error) {
      // The domain works either way; the email is a courtesy.
      console.error("Couldn't send the domain-live email", error);
    }
  }
  return {
    ...toDomainView(input.row),
    stage: result.stage,
    diagnosis: result.diagnosis,
    checkedAt: new Date().toISOString(),
  };
}

/** The owner says they've added the records: check straight away. */
export async function recordsAdded(input: {
  userId: string;
  siteId: string;
  subdomain: string;
  owner: { email: string };
  invalidate: Invalidate;
}): Promise<DomainResult> {
  const db = getDb();
  await markDomainRecordsAdded(db, { userId: input.userId, siteId: input.siteId });
  const row = await getSiteDomain(db, { userId: input.userId, siteId: input.siteId });
  if (!row) return { ok: true, view: null };
  return { ok: true, view: await checkSiteDomain({ ...input, row }) };
}

/** Disconnects a site's domain. The site goes back to its own address at once. */
export async function disconnectDomain(input: {
  userId: string;
  siteId: string;
  invalidate: Invalidate;
}): Promise<{ domain: string } | null> {
  const removed = await removeSiteDomain(getDb(), { userId: input.userId, siteId: input.siteId });
  if (!removed) return null;
  await releaseFromProvider(removed);
  forgetDomainRouting();
  input.invalidate(removed.subdomain);
  return { domain: removed.domain };
}
