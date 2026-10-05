import { templateList, type TemplateDefinition } from "@ceomaker/templates";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RevealOnScroll } from "@/components/reveal";
import { ArrowRight, Blueprint } from "@/components/ui";
import { delay, Footer, Header, kicker, pad } from "../landing/chrome";
import { PlanTag, SampleSiteLink, TEMPLATE_SHOTS } from "../landing/templates";

export const metadata: Metadata = {
  title: "Templates",
  description:
    "Five personal website templates for executives, founders and board members. Meridian is free; Monument, Salon, Folio and Tempo come with Pro.",
  alternates: { canonical: "/templates" },
};

/** What a template shows beyond the content every template has. */
function extras(template: TemplateDefinition): string[] {
  const { shows } = template;
  return [
    shows.gallery && "Photo gallery",
    shows.aboutImage && "About photo",
    shows.workImages && "Project images",
    shows.quotePhotos && "Photos with quotes",
    shows.focusSection && "Current focus",
    shows.cta && "Closing invitation",
    template.contactForm && "Contact form",
  ].filter((extra): extra is string => typeof extra === "string");
}

function TemplateRow({ template, index }: { template: TemplateDefinition; index: number }) {
  const shots = TEMPLATE_SHOTS[template.key];
  return (
    <article
      id={template.key}
      className="grid scroll-mt-24 items-center gap-x-14 gap-y-8 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]"
    >
      {/* The desktop page with the phone in front of it, at its corner. */}
      <div data-reveal="" className="relative pr-[9%] pb-[9%]">
        <Blueprint className="bg-neutral-100 p-2 shadow-md">
          <Image
            src={shots.desktop}
            alt={`The ${template.name} sample site on a laptop`}
            sizes="(min-width: 1200px) 640px, (min-width: 768px) 55vw, 100vw"
            placeholder="blur"
            priority={index === 0}
            className="block h-auto w-full border border-divider"
          />
        </Blueprint>
        <Image
          src={shots.phone}
          alt={`The ${template.name} sample site on a phone`}
          sizes="(min-width: 1200px) 150px, 24vw"
          placeholder="blur"
          className="absolute right-0 bottom-0 h-auto w-[24%] rounded-[14px] border-4 border-text shadow-lg"
        />
      </div>
      <div data-reveal="" className="flex flex-col gap-4" style={delay(120)}>
        <span className="flex items-center gap-3">
          <h2 className="m-0 font-heading text-[clamp(40px,5vw,56px)] leading-none font-semibold uppercase">
            {template.name}
          </h2>
          <PlanTag template={template} />
        </span>
        <p className="m-0 text-[17px] leading-normal text-neutral-800">{template.description}</p>
        <ul aria-label="Also shows" className="m-0 flex list-none flex-wrap gap-2 p-0">
          {extras(template).map((extra) => (
            <li key={extra} className="chip" style={{ padding: "6px 12px", fontSize: 14 }}>
              {extra}
            </li>
          ))}
        </ul>
        <SampleSiteLink template={template} className="btn btn-secondary mt-2 gap-2 self-start" />
      </div>
    </article>
  );
}

export default function TemplatesPage() {
  return (
    <div className="min-h-dvh">
      <Header />
      <main>
        <section
          style={{
            background:
              "radial-gradient(900px 460px at 50% 0%, var(--color-accent-100), transparent 70%)",
          }}
        >
          <div
            className="mx-auto flex max-w-[900px] flex-col items-center gap-5 text-center"
            style={{ padding: `88px ${pad} 72px` }}
          >
            <span className={`cm-rise ${kicker}`}>Templates</span>
            <h1
              className="cm-rise m-0 font-heading text-[clamp(52px,7.5vw,96px)] leading-[0.95] font-semibold text-balance uppercase"
              style={delay(90)}
            >
              Five designs for one profile
            </h1>
            <p
              className="cm-rise m-0 max-w-[640px] text-xl leading-normal text-pretty text-neutral-800"
              style={delay(200)}
            >
              Every template shows the same content, and you can switch until you publish. Meridian
              is free; the others come with Pro. The samples show Amelia Hart, a fictional
              executive.
            </p>
            <div className="cm-rise mt-2 flex flex-wrap justify-center gap-3" style={delay(300)}>
              <Link href="/start" className="btn btn-primary gap-2">
                Start free <ArrowRight size={16} />
              </Link>
              <Link href="/#pricing" className="btn btn-secondary">
                Compare plans
              </Link>
            </div>
          </div>
        </section>
        <div
          className="mx-auto flex max-w-[1200px] flex-col gap-[clamp(72px,10vw,128px)]"
          style={{ padding: `56px ${pad} 112px` }}
        >
          {templateList.map((template, index) => (
            <TemplateRow key={template.key} template={template} index={index} />
          ))}
        </div>
        <section className="bg-accent-900 text-bg">
          <div
            className="mx-auto flex max-w-[1000px] flex-col items-center gap-6 text-center"
            style={{ padding: `96px ${pad}` }}
          >
            <h2
              data-reveal=""
              className="m-0 font-heading text-[clamp(44px,6vw,80px)] leading-[0.95] font-semibold text-balance uppercase"
            >
              See your own site in each of them.
            </h2>
            <span className="max-w-[560px] text-[19px] text-accent-200">
              Answer a few questions, and the editor shows your draft in every template.
            </span>
            <Link
              href="/start"
              className="btn mt-2 gap-2 bg-bg text-text hover:bg-accent-100 hover:text-text"
            >
              Start free <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <RevealOnScroll />
    </div>
  );
}
