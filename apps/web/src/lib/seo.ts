import type { PublishedSite } from "@ceomaker/db";
import {
  parseSiteContentForRender,
  roleFromEyebrow,
  siteDescription,
  siteTitle,
} from "@ceomaker/schema";
import { siteUrl } from "./routing";

// What search engines see beyond the pages themselves: whether a deployment may be indexed,
// each customer site's robots.txt and sitemap, and the structured data that tells them who a
// site is about.

type Env = Record<string, string | undefined>;

/**
 * Search engines may index the production deployment only. Previews (preview.ceomaker.app and
 * its sites, *.vercel.app) and local runs would otherwise show up as copies of real pages.
 */
export function isIndexable(env: Env = process.env): boolean {
  return env.VERCEL_ENV === "production";
}

/** A site's address: its live custom domain, else its own subdomain. No trailing slash. */
export function canonicalSiteUrl(site: Pick<PublishedSite, "customDomain" | "subdomain">): string {
  return site.customDomain ? `https://${site.customDomain}` : siteUrl(site.subdomain);
}

const CLOSED = "User-agent: *\nDisallow: /\n";

/** robots.txt for a site host: open with its sitemap when the site is live, closed otherwise. */
export function siteRobots(canonical: string | null, indexable = isIndexable()): string {
  if (!canonical || !indexable) return CLOSED;
  return `User-agent: *\nAllow: /\n\nSitemap: ${canonical}/sitemap.xml\n`;
}

function escapeXml(value: string): string {
  return value.replace(
    /[<>&'"]/g,
    (character) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character]!,
  );
}

/** A live site's sitemap: its one page, dated by its last publish. */
export function siteSitemap(canonical: string, lastModified: Date): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${escapeXml(`${canonical}/`)}</loc><lastmod>${lastModified.toISOString()}</lastmod></url>`,
    "</urlset>",
    "",
  ].join("\n");
}

/** Profiles that are the same person elsewhere. Company and other websites aren't. */
const PROFILE_HOSTS =
  /(^|\.)(linkedin\.com|x\.com|twitter\.com|github\.com|instagram\.com|youtube\.com)$/i;
const PROFILE_KINDS = new Set(["linkedin", "x", "github", "instagram", "youtube"]);

function profileLinks(links: { href: string; kind?: string | undefined }[]): string[] {
  const found: string[] = [];
  for (const link of links) {
    let url: URL;
    try {
      url = new URL(link.href);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    if (!(link.kind && PROFILE_KINDS.has(link.kind)) && !PROFILE_HOSTS.test(url.hostname)) continue;
    if (!found.includes(url.href)) found.push(url.href);
  }
  return found;
}

/**
 * Structured data for a live site: a profile page about one person, with their role,
 * organisation, portrait and profiles elsewhere (LinkedIn, X), so search engines connect the
 * site to the person. Only what the page itself shows; no email or location.
 */
export function siteStructuredData(site: PublishedSite, canonical: string): object | null {
  const { meta, sections } = parseSiteContentForRender(site.content);
  if (!meta) return null;
  const hero = sections.find((section) => section.type === "hero");
  const contact = sections.find((section) => section.type === "contact");
  const heroFields = hero?.type === "hero" ? hero : undefined;
  const role = meta.role || roleFromEyebrow(heroFields?.eyebrow) || undefined;
  const image = heroFields?.image?.src;
  const sameAs = contact?.type === "contact" ? profileLinks(contact.links) : [];
  const person: Record<string, unknown> = {
    "@type": "Person",
    name: meta.name,
    url: `${canonical}/`,
  };
  if (role) person.jobTitle = role;
  if (meta.company) person.worksFor = { "@type": "Organization", name: meta.company };
  if (heroFields?.headline && heroFields.headline !== meta.name) {
    person.description = heroFields.headline;
  }
  if (image) person.image = image.startsWith("/") ? `${canonical}${image}` : image;
  if (sameAs.length) person.sameAs = sameAs;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${canonical}/`,
    name: siteTitle(meta, heroFields),
    description: siteDescription(meta, heroFields),
    dateModified: site.publishedAt.toISOString(),
    mainEntity: person,
  };
}

/**
 * JSON for a <script type="application/ld+json">. Content is the owner's text, so anything
 * that could close the script or start markup is escaped.
 */
export function jsonLd(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** The product, for the landing page: what CEOMaker is and what it costs. */
export function productStructuredData(appUrl: string, proMonthly: number, proYearly: number) {
  const organization = {
    "@type": "Organization",
    "@id": `${appUrl}/#organization`,
    name: "CEOMaker",
    url: `${appUrl}/`,
    logo: `${appUrl}/brand/ceomaker-icon-120.png`,
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "WebSite",
        "@id": `${appUrl}/#website`,
        name: "CEOMaker",
        url: `${appUrl}/`,
        publisher: { "@id": organization["@id"] },
      },
      {
        "@type": "SoftwareApplication",
        name: "CEOMaker",
        url: `${appUrl}/`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Personal websites for executives: answer a few questions, AI drafts a polished site in your voice, and it goes live at your own address in minutes.",
        publisher: { "@id": organization["@id"] },
        offers: [
          { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
          {
            "@type": "Offer",
            name: "Pro, monthly",
            price: String(proMonthly),
            priceCurrency: "USD",
          },
          { "@type": "Offer", name: "Pro, yearly", price: String(proYearly), priceCurrency: "USD" },
        ],
      },
    ],
  };
}
