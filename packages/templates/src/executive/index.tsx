import type { Section } from "@ceomaker/schema";
import type { TemplateProps } from "../types";
import { About } from "./sections/about";
import { Achievements } from "./sections/achievements";
import { Contact } from "./sections/contact";
import { CallToActionBand } from "./sections/cta";
import { Experience } from "./sections/experience";
import { Hero } from "./sections/hero";
import { Portfolio } from "./sections/portfolio";
import { Testimonials } from "./sections/testimonials";
import { Container } from "./ui";

function renderSection(section: Section) {
  switch (section.type) {
    case "hero":
      return <Hero section={section} />;
    case "about":
      return <About section={section} />;
    case "achievements":
      return <Achievements section={section} />;
    case "experience":
      return <Experience section={section} />;
    case "portfolio":
      return <Portfolio section={section} />;
    case "testimonials":
      return <Testimonials section={section} />;
    case "contact":
      return <Contact section={section} />;
    case "cta":
      return <CallToActionBand section={section} />;
  }
}

function navLabel(section: Section): string | null {
  switch (section.type) {
    case "hero":
    case "cta":
      return null;
    default:
      return section.heading;
  }
}

export function ExecutiveTemplate({ content, publishedAt }: TemplateProps) {
  const sections = content.sections.filter((section) => section.visible);
  const navItems = sections
    .map((section) => ({ id: section.id, label: navLabel(section) }))
    .filter((item): item is { id: string; label: string } => item.label !== null)
    .slice(0, 5);
  const name = content.meta?.name;
  const firstId = sections[0]?.id;

  return (
    <>
      <a
        href={firstId ? `#${firstId}` : "#main"}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-site focus:bg-site-primary focus:px-4 focus:py-2 focus:text-site-on-primary"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-site-fg/10 bg-site-bg/85 backdrop-blur supports-[backdrop-filter]:bg-site-bg/70">
        <Container className="flex h-16 items-center justify-between gap-6">
          <a
            href={firstId ? `#${firstId}` : "#main"}
            className="font-site-heading text-lg font-semibold tracking-tight"
          >
            {name}
          </a>
          {navItems.length > 0 ? (
            <nav aria-label="Sections" className="hidden sm:block">
              <ul className="flex gap-7 text-sm">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="text-site-muted transition-colors hover:text-site-fg"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </Container>
      </header>
      <main id="main">
        {sections.map((section) => (
          <div key={section.id}>{renderSection(section)}</div>
        ))}
      </main>
      <footer className="border-t border-site-fg/10 py-10 text-sm text-site-muted">
        <Container className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {publishedAt.getUTCFullYear()} {name}
          </p>
        </Container>
      </footer>
    </>
  );
}
