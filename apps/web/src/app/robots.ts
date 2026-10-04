import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/routing";
import { isIndexable } from "@/lib/seo";

/**
 * robots.txt for the product (www). Customer sites have their own, served by their host (see
 * /s/[subdomain]/robots.txt). Previews and local runs keep every crawler out.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/"] },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
