import {
  DEFAULT_TEMPLATE_KEY,
  isValidSubdomain,
  normalizeTemplateKey,
  parseSiteContentForRender,
  parseThemeSettingsForRender,
  resolveSiteColors,
  siteDescription,
  siteTitle,
} from "@ceomaker/schema";
import { monogramIconDataUri, SiteRenderer } from "@ceomaker/templates";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PLATFORM_ICON_DATA_URI } from "@/lib/brand";
import { routingConfigFromEnv, siteUrl } from "@/lib/routing";
import { getTenantSite } from "@/lib/sites";
import { SiteStatus } from "../../site-status";

type Params = PageProps<"/s/[subdomain]">["params"];

/**
 * Cache Components needs at least one param to validate this route at build time. The
 * placeholder fails subdomain validation, so it resolves to not-found without a database query.
 * Real sites are rendered on first visit, then served from the cache until republished.
 */
export async function generateStaticParams() {
  return [{ subdomain: "__shell__" }];
}

async function loadSite(subdomain: string) {
  if (!isValidSubdomain(subdomain)) return null;
  return getTenantSite(subdomain);
}

const NOT_LIVE: Metadata = {
  title: "Site not found",
  robots: { index: false, follow: false },
  icons: { icon: PLATFORM_ICON_DATA_URI },
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { subdomain } = await params;
  const tenant = await loadSite(subdomain);
  if (tenant?.status === "paused") {
    return { ...NOT_LIVE, title: "This site is taking a break" };
  }
  if (tenant?.status !== "published") return NOT_LIVE;

  const { site } = tenant;
  const { meta, sections } = parseSiteContentForRender(site.content);
  const hero = sections.find((section) => section.type === "hero");
  const name = meta?.name ?? subdomain;
  const title = meta ? siteTitle(meta, hero) : subdomain;
  const description = meta ? siteDescription(meta, hero) : undefined;
  const key = normalizeTemplateKey(site.templateKey) ?? DEFAULT_TEMPLATE_KEY;
  const colors = resolveSiteColors(parseThemeSettingsForRender(site.theme), key);
  const routing = routingConfigFromEnv();
  const url = siteUrl(subdomain, routing);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    icons: { icon: monogramIconDataUri(name, colors) },
    openGraph: { type: "profile", title, description, url },
    twitter: { card: "summary", title, description },
    // Path-mode addresses (e.g. on *.vercel.app) are temporary. Keeping them out of search
    // indexes avoids duplicates competing with the real domain after launch.
    ...(routing.mode === "path" ? { robots: { index: false, follow: false } } : {}),
  };
}

async function TenantSite({ params }: { params: Params }) {
  const { subdomain } = await params;
  const tenant = await loadSite(subdomain);
  // Unpublished and unclaimed addresses look the same, so drafts can't be discovered.
  if (!tenant || tenant.status === "draft") notFound();
  if (tenant.status === "paused") return <SiteStatus variant="paused" />;

  const { site } = tenant;
  return (
    <SiteRenderer
      templateKey={site.templateKey}
      theme={site.theme}
      content={site.content}
      publishedAt={site.publishedAt}
    />
  );
}

export default function TenantPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <TenantSite params={params} />
    </Suspense>
  );
}
