import { isPremiumTemplate, type TemplateKey } from "@ceomaker/schema";
import { templateList, type TemplateDefinition } from "@ceomaker/templates";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ExternalLink } from "@/components/icons";
import { ProTag } from "@/components/pro";
import { ArrowRight, Blueprint } from "@/components/ui";
import { sampleSitePath } from "@/lib/template-samples";
import { kicker, pad, sectionTitle } from "./chrome";
import { CARD_GRID, cardColumns, cardDelay } from "./columns";
import folio from "./shots/folio-desktop.png";
import meridian from "./shots/meridian-desktop.png";
import monument from "./shots/monument-desktop.png";
import salon from "./shots/salon-desktop.png";
import tempo from "./shots/tempo-desktop.png";

// The template cards of the landing page and /templates (design: "Template Card.dc.html" and
// "Templates Page.dc.html").

/**
 * The first screen of each sample site (/templates/<key>) at 1280 × 800. Made by
 * scripts/template-shots.mjs; take them again when the sample content or a template's newest
 * design changes.
 */
const SHOTS: Record<TemplateKey, StaticImageData> = { meridian, monument, salon, folio, tempo };

/** One template: its picture, plan and line, opening its sample site in a new tab. */
export function TemplateCard({ template }: { template: TemplateDefinition }) {
  return (
    <Blueprint
      as="article"
      className="lift group flex h-full flex-col bg-neutral-100 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent"
    >
      <div className="aspect-[16/10] overflow-hidden border-b border-divider bg-neutral-200">
        <Image
          src={SHOTS[template.key]}
          alt=""
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          placeholder="blur"
          className="block size-full object-cover object-top"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2" style={{ padding: "18px 20px 6px" }}>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h3 className="m-0 min-w-0 font-heading text-2xl leading-none font-semibold uppercase [overflow-wrap:anywhere]">
            {template.name}
          </h3>
          {isPremiumTemplate(template.key) ? (
            <ProTag />
          ) : (
            <span className="tag tag-free">Free</span>
          )}
        </div>
        <p className="m-0 line-clamp-3 text-[15px] leading-[1.45] text-pretty text-neutral-800">
          {template.tagline}
        </p>
        {/* The link covers the card, so the whole card opens the sample site. */}
        <a
          href={sampleSitePath(template.key)}
          target="_blank"
          rel="noopener"
          className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start font-heading text-[15px] font-semibold tracking-[0.01em] text-accent-700 no-underline underline-offset-3 outline-none group-hover:text-accent-600 group-hover:underline after:absolute after:inset-0 after:content-['']"
        >
          View sample site
          <span className="sr-only"> · {template.name}, opens in a new tab</span>
          <ExternalLink size={16} />
        </a>
      </div>
    </Blueprint>
  );
}

const LANDING_CARDS = 6;
const LANDING_CARDS_PHONE = 3;

/** The landing page's Templates section: the first few templates and a way to all of them. */
export function TemplatesSection() {
  const shown = templateList.slice(0, LANDING_CARDS);
  return (
    <section
      id="templates"
      className="mx-auto flex max-w-[1200px] flex-col gap-9 sm:gap-12"
      style={{ padding: `clamp(80px,9vw,112px) ${pad}` }}
    >
      <div data-reveal="" className="flex flex-col items-center gap-3.5 text-center">
        <span className={kicker}>Templates</span>
        <h2 className={`${sectionTitle} text-balance`}>One draft. Every template.</h2>
        <span className="max-w-[600px] text-[17px] text-pretty text-neutral-800">
          Your answers fill whichever template you pick, and you can switch freely until you
          publish.
        </span>
      </div>
      <ul className={CARD_GRID}>
        {shown.map((template, index) => (
          <li
            key={template.key}
            data-reveal=""
            className={`flex flex-col ${cardColumns(index, shown.length)} ${index >= LANDING_CARDS_PHONE ? "max-sm:hidden" : ""}`}
            style={cardDelay(index)}
          >
            <TemplateCard template={template} />
          </li>
        ))}
      </ul>
      <Link
        href="/templates"
        className="btn btn-secondary min-h-12 gap-2 self-stretch sm:min-w-[240px] sm:self-center"
        style={{ padding: "12px 20px", fontSize: 16, justifyContent: "center" }}
      >
        See all templates <ArrowRight size={16} />
      </Link>
    </section>
  );
}
