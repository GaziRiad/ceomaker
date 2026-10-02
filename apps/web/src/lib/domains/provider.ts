import "server-only";
import type { DnsRecord, DomainKind } from "@ceomaker/schema";
import { serverEnv } from "../env";
import type { ExpectedRecords } from "./dns";

/** Hosting-side status of a domain: the records it wants, and which hosts it already serves. */
export interface ProviderStatus {
  /** Extra records needed when the domain is in use on another account (usually one TXT). */
  verification: DnsRecord[];
  /** Hosts the provider confirms are pointed at it correctly. */
  configured: string[];
}

/**
 * Where customer domains are actually served and secured. Everything specific to the host
 * lives behind this interface, so moving hosts means another implementation, not a rewrite.
 */
export interface DomainProvider {
  readonly name: "vercel" | "local";
  /** The values to give an owner for a new domain. */
  targets(domain: string): Promise<ExpectedRecords>;
  /** Starts serving the domain (and its www host for an apex domain). */
  add(domain: string, kind: DomainKind): Promise<ProviderStatus>;
  status(domain: string, kind: DomainKind): Promise<ProviderStatus>;
  remove(domain: string, kind: DomainKind): Promise<void>;
  /** True once the domain answers over HTTPS with a valid certificate. */
  secured(domain: string): Promise<boolean>;
}

export class DomainProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "DomainProviderError";
  }
}

const VERCEL_API = "https://api.vercel.com";
const FALLBACK_TARGETS: ExpectedRecords = { a: "76.76.21.21", cname: "cname.vercel-dns.com" };

const hostsOf = (domain: string, kind: DomainKind) =>
  kind === "apex" ? [domain, `www.${domain}`] : [domain];

async function httpsWorks(domain: string): Promise<boolean> {
  try {
    await fetch(`https://${domain}/`, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    return true;
  } catch {
    return false;
  }
}

interface VercelProjectDomain {
  name: string;
  verified: boolean;
  verification?: { type: string; domain: string; value: string; reason?: string }[];
}

interface VercelDomainConfig {
  misconfigured?: boolean;
  recommendedIPv4?: { rank: number; value: string[] }[];
  recommendedCNAME?: { rank: number; value: string }[];
}

function vercelProvider(config: {
  token: string;
  projectId: string;
  teamId?: string;
  cname?: string;
}): DomainProvider {
  const query = (extra: Record<string, string> = {}) => {
    const params = new URLSearchParams(extra);
    if (config.teamId) params.set("teamId", config.teamId);
    const text = params.toString();
    return text ? `?${text}` : "";
  };
  const call = async <T>(
    path: string,
    init: RequestInit = {},
  ): Promise<{ status: number; body: T }> => {
    const response = await fetch(`${VERCEL_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const body = (await response.json().catch(() => ({}))) as T;
    return { status: response.status, body };
  };
  const project = `/v10/projects/${encodeURIComponent(config.projectId)}/domains`;
  const projectV9 = `/v9/projects/${encodeURIComponent(config.projectId)}/domains`;

  const verificationOf = (domain: VercelProjectDomain | undefined): DnsRecord[] =>
    domain && !domain.verified
      ? (domain.verification ?? [])
          .filter((record) => record.type === "TXT")
          .map((record) => ({ type: "TXT" as const, name: record.domain, value: record.value }))
      : [];

  const status = async (domain: string, kind: DomainKind): Promise<ProviderStatus> => {
    const hosts = hostsOf(domain, kind);
    const [projectDomain, ...configs] = await Promise.all([
      call<VercelProjectDomain>(`${projectV9}/${encodeURIComponent(domain)}${query()}`),
      ...hosts.map((host) =>
        call<VercelDomainConfig>(
          `/v6/domains/${encodeURIComponent(host)}/config${query({ projectIdOrName: config.projectId })}`,
        ),
      ),
    ]);
    return {
      verification: projectDomain.status === 200 ? verificationOf(projectDomain.body) : [],
      configured: hosts.filter(
        (_, index) =>
          configs[index]!.status === 200 && configs[index]!.body.misconfigured === false,
      ),
    };
  };

  return {
    name: "vercel",
    async targets(domain) {
      const { status: code, body } = await call<VercelDomainConfig>(
        `/v6/domains/${encodeURIComponent(domain)}/config${query({ projectIdOrName: config.projectId })}`,
      );
      const best = <T extends { rank: number }>(list: T[] | undefined) =>
        list?.slice().sort((a, b) => a.rank - b.rank)[0];
      const ip = code === 200 ? best(body.recommendedIPv4)?.value[0] : undefined;
      const cname = code === 200 ? best(body.recommendedCNAME)?.value : undefined;
      return {
        a: ip ?? FALLBACK_TARGETS.a,
        cname: (config.cname ?? cname ?? FALLBACK_TARGETS.cname).replace(/\.$/, ""),
      };
    },
    async add(domain, kind) {
      const entries =
        kind === "apex"
          ? [{ name: domain }, { name: `www.${domain}`, redirect: domain, redirectStatusCode: 308 }]
          : [{ name: domain }];
      for (const entry of entries) {
        const { status: code, body } = await call<{ error?: { code?: string; message?: string } }>(
          `${project}${query()}`,
          { method: "POST", body: JSON.stringify(entry) },
        );
        if (code === 409) {
          // Already on this project (a retry, or re-adding after a removal) is fine.
          const existing = await call(`${projectV9}/${encodeURIComponent(entry.name)}${query()}`);
          if (existing.status === 200) continue;
        }
        if (code >= 400) {
          throw new DomainProviderError(
            body.error?.message ?? `Vercel refused ${entry.name} (${code})`,
            body.error?.code ?? `http_${code}`,
          );
        }
      }
      return status(domain, kind);
    },
    status,
    async remove(domain, kind) {
      for (const host of hostsOf(domain, kind).reverse()) {
        const { status: code } = await call(`${projectV9}/${encodeURIComponent(host)}${query()}`, {
          method: "DELETE",
        });
        if (code >= 400 && code !== 404) {
          throw new DomainProviderError(`Vercel couldn't remove ${host} (${code})`, `http_${code}`);
        }
      }
    },
    secured: httpsWorks,
  };
}

/**
 * Development without Vercel credentials: shows Vercel's standard records and relies on public
 * DNS alone, so the whole flow can be tried locally with a real domain.
 */
const localProvider: DomainProvider = {
  name: "local",
  targets: async () => FALLBACK_TARGETS,
  add: async () => ({ verification: [], configured: [] }),
  status: async () => ({ verification: [], configured: [] }),
  remove: async () => {},
  secured: async () => true,
};

/**
 * The provider for this deployment, or null when custom domains can't work here (production
 * without Vercel credentials). Preview deployments never touch the production project's domains.
 */
export function domainProvider(): DomainProvider | null {
  const env = serverEnv();
  const onVercel = Boolean(process.env.VERCEL);
  const production = process.env.NODE_ENV === "production";
  if (
    env.VERCEL_API_TOKEN &&
    env.VERCEL_PROJECT_ID &&
    (!onVercel || process.env.VERCEL_ENV === "production")
  ) {
    return vercelProvider({
      token: env.VERCEL_API_TOKEN,
      projectId: env.VERCEL_PROJECT_ID,
      teamId: env.VERCEL_TEAM_ID,
      cname: env.CUSTOM_DOMAIN_CNAME,
    });
  }
  return production ? null : localProvider;
}
