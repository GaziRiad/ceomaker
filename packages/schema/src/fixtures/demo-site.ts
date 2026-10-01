import type { SiteContentInput } from "../site";
import { emptyThemeSettings, type ThemeSettings } from "../theme";

/** A fictional executive used for local development, previews and tests. */
export const demoSiteContent = {
  schemaVersion: 1,
  meta: {
    name: "Amelia Hart",
    role: "Chief Executive Officer",
    company: "Meridian Freight Group",
    location: "Rotterdam",
    availability: "Open to board and advisory roles",
    availabilityShort: "Board and advisory roles",
    affiliations: [
      "Meridian Freight Group",
      "European Freight Council",
      "Alder & Crane Logistics",
      "Northgate Capital",
      "Industrial Founders Network",
    ],
    keywords: ["Operator", "Board member", "Speaker", "Mentor"],
  },
  sections: [
    {
      id: "hero",
      type: "hero",
      eyebrow: "Chief Executive Officer, Meridian Freight Group",
      headline: "Building supply chains that hold up under pressure.",
      subheadline:
        "I lead a 2,400-person logistics company moving goods across 31 countries. I write and speak about resilient operations, practical AI adoption, and leading through volatility.",
      primaryCta: { label: "Get in touch", href: "#contact" },
    },
    {
      id: "impact",
      type: "achievements",
      items: [
        { value: "€780M", label: "Annual revenue, up from €310M" },
        { value: "31", label: "Countries served" },
        { value: "2,400", label: "People across the group" },
        { value: "42%", label: "Reduction in delivery variance" },
      ],
    },
    {
      id: "about",
      type: "about",
      body: [
        {
          spans: [
            { text: "I joined Meridian as COO in 2015, when it was a regional carrier with " },
            { text: "thin margins and no shared planning system", italic: true },
            {
              text: ". Six years later we run one of Europe's most reliable mid-sized freight networks.",
            },
          ],
        },
        {
          spans: [
            {
              text: "Before Meridian, I spent a decade in operations at Alder & Crane Logistics in Hamburg. I sit on the board of the European Freight Council and mentor first-time founders in industrial technology.",
            },
          ],
        },
      ],
    },
    {
      id: "experience",
      type: "experience",
      items: [
        {
          role: "Chief Executive Officer",
          organization: "Meridian Freight Group",
          location: "Rotterdam",
          start: "2019",
          end: "Present",
          summary:
            "Grew revenue 2.5x while cutting on-time delivery variance by 42%. Led the acquisition and integration of three regional carriers.",
        },
        {
          role: "Chief Operating Officer",
          organization: "Meridian Freight Group",
          location: "Rotterdam",
          start: "2015",
          end: "2019",
          summary:
            "Rebuilt the operating model around a single planning platform and a weekly operating review adopted across all depots.",
        },
        {
          role: "VP Operations",
          organization: "Alder & Crane Logistics",
          location: "Hamburg",
          start: "2010",
          end: "2015",
          summary: "Ran network operations for Northern Europe, 600 staff across 9 depots.",
        },
      ],
    },
    {
      id: "work",
      type: "portfolio",
      items: [
        {
          kind: "Keynote",
          title: "Resilient networks for a volatile decade",
          meta: "European Freight Forum",
          year: "2025",
        },
        {
          kind: "Essay",
          title: "Why planning beats forecasting",
          meta: "Op-ed, logistics trade press",
          year: "2024",
        },
        {
          kind: "Board",
          title: "European Freight Council",
          meta: "Non-executive director",
          year: "Since 2021",
        },
        {
          kind: "Mentoring",
          title: "Industrial founders programme",
          meta: "Mentor to first-time founders",
          year: "Since 2019",
        },
      ],
    },
    {
      id: "testimonials",
      type: "testimonials",
      items: [
        {
          quote:
            "Amelia combines operational depth with a rare calm under pressure. She made the hard calls early, and the business is stronger for it.",
          author: "Jonas Weber",
          role: "Chair, Meridian Freight Group",
        },
        {
          quote: "The clearest thinker on supply chain resilience I have worked with.",
          author: "Priya Raman",
          role: "Partner, Northgate Capital",
        },
      ],
    },
    {
      id: "contact",
      type: "contact",
      blurb: "For speaking, board and advisory enquiries.",
      email: "office@example.com",
      links: [
        { label: "LinkedIn", href: "https://www.linkedin.com/", kind: "linkedin" },
        { label: "Meridian Freight Group", href: "https://example.com/", kind: "website" },
      ],
    },
  ],
} satisfies SiteContentInput;

export const demoThemeSettings: ThemeSettings = emptyThemeSettings;
