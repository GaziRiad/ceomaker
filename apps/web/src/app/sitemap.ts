import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/routing";

/**
 * The product's public pages. Customer sites aren't listed here: each is its own site to search
 * engines, with its own sitemap on its own host.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
