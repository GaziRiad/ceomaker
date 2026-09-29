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
