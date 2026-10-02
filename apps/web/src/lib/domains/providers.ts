/** Step-by-step guides for adding DNS records at the registrars most owners use. */
export const DNS_PROVIDERS = {
  godaddy: {
    name: "GoDaddy",
    steps: [
      "Sign in to GoDaddy and open My Products.",
      "Next to your domain, choose DNS.",
      "Choose Add New Record, pick the type, and paste the Name and Value. Repeat for each row.",
      "Save. If an A record for @ already exists, edit it to the new value instead.",
    ],
  },
  namecheap: {
    name: "Namecheap",
    steps: [
      "Sign in to Namecheap and open Domain List.",
      "Choose Manage next to your domain, then Advanced DNS.",
      "Choose Add New Record and paste each row. Use @ for the main domain.",
      "Select the tick on each record to save it.",
    ],
  },
  cloudflare: {
    name: "Cloudflare",
    steps: [
      "Sign in to Cloudflare and select your domain.",
      "Open DNS, then Records.",
      "Choose Add record and paste each row.",
      "Set Proxy status to DNS only (grey cloud), then save.",
    ],
  },
  squarespace: {
    name: "Squarespace Domains",
    steps: [
      "Sign in to Squarespace and open Domains.",
      "Choose your domain, then DNS.",
      "Under Custom records, choose Add record and paste each row.",
      "Save. Delete any default records for @ or www that point elsewhere.",
    ],
  },
  other: {
    name: "Google or other",
    steps: [
      "Sign in where you bought your domain.",
      "Look for DNS, DNS settings or Manage DNS.",
      "Add each record from the table: same Type, Name and Value.",
      "Save, then come back here. We check automatically.",
    ],
  },
} as const;

export type DnsProviderKey = keyof typeof DNS_PROVIDERS;

export function isDnsProvider(value: unknown): value is DnsProviderKey {
  return typeof value === "string" && value in DNS_PROVIDERS;
}
