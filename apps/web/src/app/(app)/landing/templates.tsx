import { isPremiumTemplate, type TemplateKey } from "@ceomaker/schema";
import { templateList, type TemplateDefinition } from "@ceomaker/templates";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ExternalLink } from "@/components/icons";
import { ProTag } from "@/components/pro";
import { ArrowRight, Blueprint } from "@/components/ui";
import { sampleSitePath } from "@/lib/template-samples";
import { delay, kicker, pad, sectionTitle } from "./chrome";
import folioDesktop from "./shots/folio-desktop.png";
import folioPhone from "./shots/folio-phone.png";
import meridianDesktop from "./shots/meridian-desktop.png";
import meridianPhone from "./shots/meridian-phone.png";
import monumentDesktop from "./shots/monument-desktop.png";
import monumentPhone from "./shots/monument-phone.png";
import salonDesktop from "./shots/salon-desktop.png";
import salonPhone from "./shots/salon-phone.png";
import tempoDesktop from "./shots/tempo-desktop.png";
import tempoPhone from "./shots/tempo-phone.png";

/**
 * The first screen of each sample site (/templates/<key>) at 1280 × 800 and on a 390px phone.
 * Made by scripts/template-shots.mjs; take them again when the sample content or a template's
 * newest design changes.
 */
export const TEMPLATE_SHOTS: Record<
  TemplateKey,
  { desktop: StaticImageData; phone: StaticImageData }
> = {
  meridian: { desktop: meridianDesktop, phone: meridianPhone },
  monument: { desktop: monumentDesktop, phone: monumentPhone },
  salon: { desktop: salonDesktop, phone: salonPhone },
  folio: { desktop: folioDesktop, phone: folioPhone },
  tempo: { desktop: tempoDesktop, phone: tempoPhone },
};

export function PlanTag({ template }: { template: TemplateDefinition }) {
  return isPremiumTemplate(template.key) ? (
    <ProTag />
  ) : (
    <span className="tag tag-neutral">Free</span>
  );
}

/** Opens the template's sample site in a new tab: a full site, nothing around it. */
export function SampleSiteLink({
  template,
  className,
}: {
  template: TemplateDefinition;
  className?: string;
}) {
  return (
    <a
      href={sampleSitePath(template.key)}
      target="_blank"
      rel="noopener"
      aria-label={`View the ${template.name} sample site in a new tab`}
      className={className}
    >
      View sample site <ExternalLink size={16} />
    </a>
  );
}

function TemplateCard({ template, index }: { template: TemplateDefinition; index: number }) {
  return (
    <Blueprint
      data-reveal=""
      className="lift relative flex flex-col bg-neutral-100"
      style={delay(index * 90)}
    >
      <div className="aspect-[16/10] overflow-hidden border-b border-divider bg-bg">
        <Image
          src={TEMPLATE_SHOTS[template.key].desktop}
          alt=""
          sizes="(min-width: 1200px) 370px, (min-width: 700px) 50vw, 100vw"
          placeholder="blur"
          className="block h-auto w-full"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-6">
        <span className="flex items-center gap-2.5">
          <span className="font-heading text-[28px] leading-none font-semibold uppercase">
            {template.name}
          </span>
          <PlanTag template={template} />
        </span>
        <span className="flex-1 text-[15px] text-neutral-700">{template.tagline}</span>
        {/* The link covers the card, so the whole card opens the sample site. */}
        <SampleSiteLink
          template={template}
          className="mt-2 flex items-center gap-1.5 text-[15px] after:absolute after:inset-0 after:content-['']"
        />
      </div>
    </Blueprint>
  );
}

/** The landing page's Templates section: every template, each opening its sample site. */
export function TemplatesSection() {
  return (
    <section
      id="templates"
      className="mx-auto flex max-w-[1200px] flex-col gap-12"
      style={{ padding: `112px ${pad}` }}
    >
      <div data-reveal="" className="flex flex-col items-center gap-3.5 text-center">
        <span className={kicker}>Templates</span>
        <h2 className={sectionTitle}>Your profile, in any design</h2>
        <span className="max-w-[640px] text-neutral-800">
          Every template shows the same content, so you can switch before you publish, and new
          designs are added regularly. Meridian is free; the rest come with Pro. Each opens a sample
          site for Amelia Hart, a fictional executive.
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-6">
        {templateList.map((template, index) => (
          <TemplateCard key={template.key} template={template} index={index} />
        ))}
        <Blueprint
          data-reveal=""
          className="lift relative flex flex-col justify-end gap-3 bg-accent-100 p-6"
          style={delay(templateList.length * 90)}
        >
          <span className={kicker}>All templates</span>
          <span className="font-heading text-[28px] leading-none font-semibold uppercase">
            Side by side, on desktop and phone
          </span>
          <Link
            href="/templates"
            className="mt-2 flex items-center gap-1.5 text-[15px] after:absolute after:inset-0 after:content-['']"
          >
            See all templates <ArrowRight size={16} />
          </Link>
        </Blueprint>
      </div>
    </section>
  );
}
