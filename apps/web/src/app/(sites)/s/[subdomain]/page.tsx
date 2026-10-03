import {
  isPro,
  isValidSubdomain,
  parseSiteContentForRender,
  parseThemeSettingsForRender,
  resolveSiteColors,
  resolveTemplateRef,
  siteDescription,
  SHARE_IMAGE,
  siteTitle,
} from "@ceomaker/schema";
import { monogramIconDataUri, SiteRenderer } from "@ceomaker/templates";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PLATFORM_ICON_DATA_URI } from "@/lib/brand";
import { asEntitled } from "@/lib/plan";
import { appUrl, routingConfigFromEnv, siteUrl } from "@/lib/routing";
import { getTenantSite } from "@/lib/sites";
import { SiteStatus } from "../../site-status";
import { Beacon } from "./beacon";
import { sendContactMessage } from "./contact-action";

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

  const site = asEntitled(tenant.site, tenant.site.ownerPlan);
  const { meta, sections } = parseSiteContentForRender(site.content);
  const hero = sections.find((section) => section.type === "hero");
  const name = meta?.name ?? subdomain;
  const title = meta ? siteTitle(meta, hero) : subdomain;
  const description = meta ? siteDescription(meta, hero) : undefined;
  const { key, version } = resolveTemplateRef(site.templateKey, site.templateVersion);
  const colors = resolveSiteColors(parseThemeSettingsForRender(site.theme), key, version);
  const routing = routingConfigFromEnv();
  // A live custom domain is the site's real address; its own address forwards there.
  const url = site.customDomain ? `https://${site.customDomain}` : siteUrl(subdomain, routing);
  // Uploads are served on every host, so the share image is addressed on the site's own one.
  const shareImage = meta?.shareImage && {
    url: `${url}${meta.shareImage}`,
    width: SHARE_IMAGE.width,
    height: SHARE_IMAGE.height,
    alt: title,
  };
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    icons: {
      icon: meta?.favicon
        ? { url: meta.favicon, type: "image/png", sizes: "512x512" }
        : monogramIconDataUri(name, colors),
    },
    openGraph: {
      type: "profile",
      title,
      description,
      url,
      ...(shareImage && { images: [shareImage] }),
    },
    twitter: { card: shareImage ? "summary_large_image" : "summary", title, description },
  };
}

/** The owner's own websites listed on the site (kind "website"), for "Clicked your website". */
function websiteHosts(content: unknown): string[] {
  const contact = parseSiteContentForRender(content).sections.find(
    (section) => section.type === "contact",
  );
  if (contact?.type !== "contact") return [];
  return contact.links.flatMap((link) => {
    if (link.kind !== "website") return [];
    try {
      return [new URL(link.href).hostname.replace(/^www\./, "")];
    } catch {
      return [];
    }
  });
}

/** Free sites carry a small, quiet link back to CEOMaker. Pro removes it. */
function MadeWith() {
  return (
    <a
      href={appUrl()}
      target="_blank"
      rel="noopener"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 50,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        borderRadius: 999,
        background: "rgba(17, 17, 17, 0.88)",
        color: "#ffffff",
        font: "500 12px/1 system-ui, -apple-system, 'Segoe UI', sans-serif",
        letterSpacing: "0.01em",
        textDecoration: "none",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.18)",
      }}
    >
      Made with <strong style={{ fontWeight: 700 }}>CEOMaker</strong>
    </a>
  );
}

async function TenantSite({ params }: { params: Params }) {
  const { subdomain } = await params;
  const tenant = await loadSite(subdomain);
  // Unpublished and unclaimed addresses look the same, so drafts can't be discovered.
  if (!tenant || tenant.status === "draft") notFound();
  if (tenant.status === "paused") return <SiteStatus variant="paused" />;

  const site = asEntitled(tenant.site, tenant.site.ownerPlan);
  return (
    <>
      <SiteRenderer
        templateKey={site.templateKey}
        templateVersion={site.templateVersion}
        theme={site.theme}
        content={site.content}
        publishedAt={site.publishedAt}
        sendMessage={sendContactMessage.bind(null, site.subdomain)}
      />
      <Beacon subdomain={site.subdomain} websiteHosts={websiteHosts(site.content)} />
      {isPro(site.ownerPlan) ? null : <MadeWith />}
    </>
  );
}

export default function TenantPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <TenantSite params={params} />
    </Suspense>
  );
}
