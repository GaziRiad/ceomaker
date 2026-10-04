import type { PublishedSite } from "@ceomaker/db";
import { demoSiteContent } from "@ceomaker/schema";
import { describe, expect, it } from "vitest";
import { isIndexable, jsonLd, siteRobots, siteSitemap, siteStructuredData } from "./seo";

const site: PublishedSite = {
  siteId: "s1",
  subdomain: "amelia",
  versionId: "v1",
  templateKey: "meridian",
  templateVersion: 1,
  theme: {},
  content: demoSiteContent,
  publishedAt: new Date("2026-10-01T09:00:00Z"),
  customDomain: null,
  ownerPlan: "pro",
};

describe("indexing", () => {
  it("lets search engines in on production only", () => {
    expect(isIndexable({ VERCEL_ENV: "production" })).toBe(true);
    expect(isIndexable({ VERCEL_ENV: "preview" })).toBe(false);
    expect(isIndexable({})).toBe(false);
  });

  it("opens a live site's robots.txt with its sitemap, and closes everything else", () => {
    expect(siteRobots("https://amelia.ceomaker.app", true)).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://amelia.ceomaker.app/sitemap.xml\n",
    );
    expect(siteRobots(null, true)).toBe("User-agent: *\nDisallow: /\n");
    expect(siteRobots("https://amelia.ceomaker.app", false)).toBe("User-agent: *\nDisallow: /\n");
  });

  it("lists a site's one page, dated by its last publish", () => {
    const xml = siteSitemap("https://ameliahart.com", site.publishedAt);
    expect(xml).toContain("<loc>https://ameliahart.com/</loc>");
    expect(xml).toContain("<lastmod>2026-10-01T09:00:00.000Z</lastmod>");
  });
});

describe("structured data", () => {
  it("describes the person the site is about, with their profiles elsewhere", () => {
    const data = siteStructuredData(site, "https://amelia.ceomaker.app") as {
      "@type": string;
      mainEntity: Record<string, unknown>;
    };
    expect(data["@type"]).toBe("ProfilePage");
    expect(data.mainEntity).toMatchObject({
      "@type": "Person",
      name: "Amelia Hart",
      url: "https://amelia.ceomaker.app/",
      jobTitle: "Chief Executive Officer",
      worksFor: { "@type": "Organization", name: "Meridian Freight Group" },
      sameAs: ["https://www.linkedin.com/"],
    });
  });

  it("makes an uploaded portrait's address absolute on the site's own host", () => {
    const content = {
      ...demoSiteContent,
      sections: demoSiteContent.sections.map((section) =>
        section.type === "hero"
          ? { ...section, image: { src: "/media/0b546125-b657-4ed2-b39f-846f38c86be4", alt: "" } }
          : section,
      ),
    };
    const data = siteStructuredData({ ...site, content }, "https://ameliahart.com") as {
      mainEntity: { image?: string };
    };
    expect(data.mainEntity.image).toBe(
      "https://ameliahart.com/media/0b546125-b657-4ed2-b39f-846f38c86be4",
    );
  });

  it("can't be used to close the script it sits in", () => {
    const html = jsonLd({ name: "</script><script>alert(1)</script> & co" });
    expect(html).not.toContain("<");
    expect(html).not.toContain(">");
    expect(JSON.parse(html)).toEqual({ name: "</script><script>alert(1)</script> & co" });
  });
});
