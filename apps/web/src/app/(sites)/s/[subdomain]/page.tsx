import {
  defaultTheme,
  isValidSubdomain,
  parseSiteContentForRender,
  themeSchema,
} from "@ceomaker/schema";
import { monogramIconDataUri, SiteRenderer } from "@ceomaker/templates";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { tenantUrl } from "@/lib/routing";
import { getPublishedSite } from "@/lib/sites";

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
  return getPublishedSite(subdomain);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { subdomain } = await params;
  const site = await loadSite(subdomain);
  if (!site) return { title: "Site not found", robots: { index: false, follow: false } };

  const { meta } = parseSiteContentForRender(site.content);
  const title = meta?.title ?? meta?.name ?? subdomain;
  const theme = themeSchema.safeParse(site.theme);
  return {
    metadataBase: new URL(
      tenantUrl(
        subdomain,
        process.env.APP_URL ?? "http://localhost:3000",
        process.env.ROOT_DOMAIN ?? "localhost:3000",
      ),
    ),
    title,
    description: meta?.description,
    alternates: { canonical: "/" },
    icons: {
      icon: monogramIconDataUri(meta?.name ?? subdomain, theme.success ? theme.data : defaultTheme),
    },
    openGraph: { type: "profile", title, description: meta?.description, url: "/" },
    twitter: { card: "summary", title, description: meta?.description },
  };
}

async function TenantSite({ params }: { params: Params }) {
  const { subdomain } = await params;
  const site = await loadSite(subdomain);
  if (!site) notFound();

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
