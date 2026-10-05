import { templateList } from "@ceomaker/templates";
import type { Metadata } from "next";
import Link from "next/link";
import { RevealOnScroll } from "@/components/reveal";
import { ArrowRight } from "@/components/ui";
import { Footer, Header, kicker, pad } from "../landing/chrome";
import { TemplateCard } from "../landing/templates";
import { TemplateGrid } from "./template-grid";

export const metadata: Metadata = {
  title: "Templates",
  description:
    "Personal website templates for executives, founders and board members. Every template shows your own content; switch as often as you like until you publish.",
  alternates: { canonical: "/templates" },
};

const largeButton = { padding: "12px 20px", fontSize: 16 } as const;

export default function TemplatesPage() {
  return (
    <div className="min-h-dvh">
      <Header current="/templates" />
      <main>
        <section
          style={{
            background:
              "radial-gradient(900px 460px at 50% 0%, var(--color-accent-100), transparent 70%)",
          }}
        >
          <div
            data-reveal=""
            className="mx-auto flex max-w-[1000px] flex-col items-center gap-4 text-center sm:gap-5"
            style={{ padding: `clamp(56px,7vw,88px) ${pad} clamp(40px,5vw,72px)` }}
          >
            <span className={kicker}>Templates</span>
            <h1 className="m-0 font-heading text-[clamp(48px,7vw,88px)] leading-[0.95] font-semibold tracking-[-0.01em] text-balance uppercase">
              Pick the look that suits you
            </h1>
            <p className="m-0 max-w-[640px] text-[clamp(18px,1.6vw,20px)] leading-normal text-pretty text-neutral-800">
              Every template shows your own content. Switch as often as you like until you publish.
            </p>
            <p className="m-0 max-w-[640px] text-[15px] leading-normal text-pretty text-neutral-700">
              One template is free and the rest are Pro. The sample sites show Amelia Hart, a
              fictional executive.
            </p>
            <div className="mt-2 flex flex-col gap-2.5 self-stretch sm:mt-3 sm:flex-row sm:justify-center sm:self-auto">
              <Link
                href="/start"
                className="btn btn-primary min-h-12 justify-between gap-2 sm:justify-center"
                style={largeButton}
              >
                Start free <ArrowRight size={16} />
              </Link>
              <Link
                href="/#pricing"
                className="btn btn-secondary min-h-12 justify-center"
                style={largeButton}
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>
        <section
          aria-labelledby="all-templates"
          className="mx-auto flex max-w-[1200px] flex-col"
          style={{ padding: `clamp(16px,2vw,24px) ${pad} clamp(80px,9vw,112px)` }}
        >
          <h2 id="all-templates" className="sr-only">
            All templates
          </h2>
          <TemplateGrid
            cards={templateList.map((template) => ({
              key: template.key,
              card: <TemplateCard template={template} />,
            }))}
          />
        </section>
        <section className="bg-accent-900 text-bg">
          <div
            data-reveal=""
            className="mx-auto flex max-w-[1000px] flex-col items-center gap-5 text-center sm:gap-6"
            style={{ padding: `clamp(80px,9vw,104px) ${pad}` }}
          >
            <h2 className="m-0 font-heading text-[clamp(48px,6.5vw,80px)] leading-[0.95] font-semibold text-balance uppercase">
              Try your own content in every template
            </h2>
            <span className="text-[clamp(18px,1.5vw,19px)] text-accent-200">
              Answer a few questions, then switch freely until you publish.
            </span>
            <Link
              href="/start"
              className="btn btn-primary mt-2 min-h-[50px] justify-between gap-2 self-stretch sm:min-w-[200px] sm:justify-center sm:self-auto"
              style={{ ...largeButton, fontSize: 17, padding: "14px 24px" }}
            >
              Start free <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <RevealOnScroll />
    </div>
  );
}
