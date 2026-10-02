import type { z } from "zod";

export class SiteNotFoundError extends Error {
  constructor() {
    super("Site not found");
    this.name = "SiteNotFoundError";
  }
}

export class SubdomainTakenError extends Error {
  constructor(subdomain: string) {
    super(`The subdomain "${subdomain}" is already taken`);
    this.name = "SubdomainTakenError";
  }
}

export class InvalidSiteDataError extends Error {
  constructor(readonly issues: z.core.$ZodIssue[]) {
    super(`Invalid site data: ${issues.map((issue) => issue.message).join("; ")}`);
    this.name = "InvalidSiteDataError";
  }
}

/** Postgres unique violation on a specific constraint, whether or not the driver error is wrapped. */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  for (let current: unknown = error; current; current = (current as { cause?: unknown }).cause) {
    const candidate = current as { code?: string; constraint_name?: string };
    if (candidate.code === "23505" && candidate.constraint_name === constraint) return true;
  }
  return false;
}

export class VersionNotFoundError extends Error {
  constructor() {
    super("Version not found");
    this.name = "VersionNotFoundError";
  }
}

/** Publishing needs readable text: ink on background of at least MIN_TEXT_CONTRAST. */
export class LowContrastError extends Error {
  constructor(readonly ratio: number) {
    super(`Text contrast is ${ratio.toFixed(1)}:1; publishing needs at least 4.5:1`);
    this.name = "LowContrastError";
  }
}

/** The address of a site that has been live can't change: people may have shared it. */
export class AddressLockedError extends Error {
  constructor() {
    super("The address can't change after a site has been published");
    this.name = "AddressLockedError";
  }
}

/** Another site already uses (or is connecting) this domain. */
export class DomainTakenError extends Error {
  constructor(domain: string) {
    super(`The domain "${domain}" is already connected to another site`);
    this.name = "DomainTakenError";
  }
}
