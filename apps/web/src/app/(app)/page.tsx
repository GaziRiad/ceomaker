import type { Metadata } from "next";
import Link from "next/link";
import { RevealOnScroll } from "@/components/reveal";
import { Blueprint, Check } from "@/components/ui";
import { PRO_PRICES } from "@/lib/plan-copy";
import { appUrl } from "@/lib/routing";
import { jsonLd, productStructuredData } from "@/lib/seo";
import {
  audiences,
  compare,
  faq,
  heroRoles,
  heroWords,
  quotes,
  realities,
} from "./landing/content";
import { delay, Footer, Header, kicker, pad, sectionTitle } from "./landing/chrome";
import { Pricing } from "./landing/pricing";
import { TemplatesSection } from "./landing/templates";

function startHref(role: string) {
  return `/start?role=${encodeURIComponent(role)}`;
}

function Hero() {
  return (
    <section
      style={{
        background:
          "radial-gradient(900px 460px at 50% 0%, var(--color-accent-100), transparent 70%)",
      }}
    >
      <div
        className="mx-auto flex max-w-[1000px] flex-col items-center gap-6 text-center"
        style={{ padding: `80px ${pad} 96px` }}
      >
        <div className="cm-rise flex items-center gap-2.5 rounded-full border border-divider bg-neutral-100 py-1.5 pr-3.5 pl-1.5 text-sm">
          <span aria-hidden className="flex">
            {[
              ["AH", "bg-accent-700 text-bg"],
              ["JW", "bg-accent text-bg"],
              ["PR", "bg-accent-400 text-accent-900"],
            ].map(([initials, colors], index) => (
              <span
                key={initials}
                className={`flex size-[26px] items-center justify-center rounded-full border-2 border-neutral-100 text-[11px] ${colors}`}
                style={{ marginLeft: index ? -8 : 0 }}
              >
                {initials}
              </span>
            ))}
          </span>
          Private beta · for founders, executives and investors
        </div>
        <h1 className="m-0 font-heading text-[clamp(56px,8vw,104px)] leading-[0.95] font-semibold tracking-[-0.01em] text-balance uppercase">
          {heroWords.map((word, index) => (
            <span
              key={index}
              className="cm-rise inline-block"
              style={{ margin: "0 0.11em", ...delay(90 + index * 70) }}
            >
              {word}
            </span>
          ))}
        </h1>
        <p
          className="cm-rise m-0 max-w-[620px] text-xl leading-normal text-pretty text-neutral-800"
          style={delay(480)}
        >
          Answer a few questions with a tap. CEOMaker drafts a polished site in your voice, you
          refine it, and it goes live at your own address in minutes.
        </p>
        <Blueprint
          className="cm-rise mt-7 flex w-full max-w-[820px] flex-col bg-neutral-100 text-left shadow-lg"
          style={delay(640)}
        >
          <div className="flex items-center justify-between gap-4 border-b border-divider px-5 py-3.5 text-[13px] tracking-[0.1em] text-accent-700 uppercase">
            <span>Step 1 of 5 · Let&apos;s start</span>
            <span className="text-neutral-600">About 2 minutes</span>
          </div>
          <h2 className="m-0 px-5 pt-6 pb-2 font-heading text-[32px] leading-normal font-semibold tracking-[0.01em] uppercase">
            I am a…
          </h2>
          <div className="flex flex-wrap gap-2.5 px-5 pt-2 pb-5">
            {heroRoles.map((role) => (
              <Link
                key={role}
                href={startHref(role)}
                className="chip hover:bg-accent-100 hover:shadow-sm"
                style={{ padding: "12px 18px", background: "var(--color-bg)" }}
              >
                {role}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-divider px-5 py-3.5 text-sm text-neutral-700">
            {["Mostly taps, very little typing", "Free to publish", "No card needed"].map(
              (item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check size={16} color="var(--color-accent)" />
                  {item}
                </span>
              ),
            )}
          </div>
        </Blueprint>
      </div>
    </section>
  );
}

function BuiltFor() {
  return (
    <section
      aria-label="Built for"
      className="flex items-center overflow-hidden border-y border-divider"
    >
      <span
        className="relative z-[1] flex-none bg-bg text-sm text-neutral-700"
        style={{ padding: `22px 24px 22px ${pad}` }}
      >
        Built for
      </span>
      <div
        className="min-w-0 flex-1 overflow-hidden"
        style={{
          WebkitMaskImage: "linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)",
          maskImage: "linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)",
        }}
      >
        <div className="cm-marquee flex w-max font-heading text-[22px] font-semibold tracking-[0.04em] text-neutral-600 uppercase">
          {[...audiences, ...audiences].map((audience, index) => (
            <span
              key={index}
              aria-hidden={index >= audiences.length}
              className="flex items-center gap-[22px] p-[22px] whitespace-nowrap"
            >
              {audience}
              <span className="size-[5px] bg-accent-400" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section
      className="mx-auto flex max-w-[1200px] flex-col items-center gap-5 text-center"
      style={{ padding: `112px ${pad}` }}
    >
      <span className={kicker}>Before every meeting, they look you up</span>
      <h2 data-reveal="" className={`${sectionTitle} max-w-[880px]`}>
        An outdated profile. A three-line bio. Someone else with your name.
      </h2>
      <p className="m-0 max-w-[600px] text-[19px] text-neutral-800">
        Investors, boards, journalists and future hires form a view before you speak. Give them one
        page that tells your story the way you would.
      </p>
      <div className="mt-9 grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6 text-left">
        {realities.map((reality) => (
          <Blueprint
            key={reality.n}
            data-reveal=""
            className="lift flex flex-col gap-2.5 p-7"
            style={delay(reality.delay)}
          >
            <span className="font-heading text-5xl leading-none font-semibold text-accent">
              {reality.n}
            </span>
            <span className="text-[17px] leading-normal">{reality.t}</span>
          </Blueprint>
        ))}
      </div>
    </section>
  );
}

function StepCard({
  number,
  title,
  body,
  delayMs,
  children,
}: {
  number: string;
  title: string;
  body: string;
  delayMs: number;
  children: React.ReactNode;
}) {
  return (
    <Blueprint
      data-reveal=""
      className="lift flex flex-col gap-[18px] bg-neutral-100 p-7"
      style={delay(delayMs)}
    >
      <span className="text-[13px] tracking-[0.12em] text-accent-700">{number}</span>
      {children}
      <h3 className="m-0 text-[28px] uppercase">{title}</h3>
      <span className="text-neutral-800">{body}</span>
    </Blueprint>
  );
}

function HowItWorks() {
  const chip = "rounded-[4px] border px-3 py-1.5 text-sm";
  return (
    <section id="how" className="border-y border-divider bg-surface">
      <div
        className="mx-auto flex max-w-[1200px] flex-col gap-12"
        style={{ padding: `112px ${pad}` }}
      >
        <div data-reveal="" className="flex flex-col items-center gap-3.5 text-center">
          <span className={kicker}>How it works</span>
          <h2 className={sectionTitle}>Live in three steps</h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6">
          <StepCard
            number="01"
            title="Tap through a few questions"
            body="Role, industry, what the site is for and the voice you want. Add your CV or LinkedIn if you like. Nothing is published yet."
            delayMs={0}
          >
            <div className="flex flex-wrap gap-2 border border-divider bg-bg p-4">
              <span className={`${chip} border-accent bg-accent-100`}>Chief executive</span>
              <span className={`${chip} border-divider`}>Logistics</span>
              <span className={`${chip} border-accent bg-accent-100`}>Board roles</span>
              <span className={`${chip} border-divider`}>Measured</span>
            </div>
          </StepCard>
          <StepCard
            number="02"
            title="Review your draft"
            body="CEOMaker writes a first version in a measured, professional voice. Edit any line, colour or section order."
            delayMs={110}
          >
            <div className="flex flex-col gap-2 border border-divider bg-bg p-4">
              <span className="text-xs tracking-[0.1em] text-accent-700 uppercase">
                Drafting · Hero
              </span>
              <span className="font-heading text-[22px] leading-[1.05] font-semibold uppercase">
                Building supply chains that hold up under pressure.
              </span>
              <span className="h-1.5 w-[90%] bg-neutral-300" />
              <span className="h-1.5 w-[70%] bg-neutral-300" />
            </div>
          </StepCard>
          <StepCard
            number="03"
            title="Publish"
            body="Your site goes live at yourname.ceomaker.com, fast on every phone and laptop. Your own domain is coming soon."
            delayMs={220}
          >
            <div className="flex items-center gap-2.5 border border-divider bg-bg p-4">
              <span className="size-2 rounded-full bg-accent" />
              <span className="flex-1 text-[15px]">amelia.ceomaker.com</span>
              <span className="tag tag-accent">Live</span>
            </div>
          </StepCard>
        </div>
      </div>
    </section>
  );
}

function Alternatives() {
  return (
    <section
      className="mx-auto flex max-w-[1200px] flex-col gap-12"
      style={{ padding: `112px ${pad}` }}
    >
      <div data-reveal="" className="flex flex-col items-center gap-3.5 text-center">
        <span className={kicker}>Against the alternatives</span>
        <h2 className={sectionTitle}>Agency quality, without the agency</h2>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6">
        {compare.map((option) => (
          <Blueprint
            key={option.name}
            data-reveal=""
            className={`lift flex flex-col gap-3 p-7 ${option.highlight ? "bg-accent-100" : ""}`}
            style={delay(option.delay)}
          >
            <span
              className={`text-[13px] tracking-[0.12em] uppercase ${option.highlight ? "text-accent-700" : "text-neutral-700"}`}
            >
              {option.name}
            </span>
            <span className="font-heading text-[40px] leading-none font-semibold uppercase">
              {option.time}
            </span>
            <span className="text-[15px] text-neutral-700">{option.cost}</span>
            <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0 text-[15px]">
              {option.rows.map(([mark, text]) => (
                <li
                  key={text}
                  className={`flex gap-2.5 ${mark === "✓" ? "text-text" : "text-neutral-700"}`}
                >
                  <span
                    aria-label={mark === "✓" ? "Yes:" : "No:"}
                    className={`w-3.5 flex-none ${mark === "✓" ? "text-accent-700" : "text-neutral-500"}`}
                  >
                    {mark}
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </Blueprint>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  if (quotes.length === 0) return null;
  return (
    <section className="border-y border-divider bg-surface">
      <div
        className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-6"
        style={{ padding: `112px ${pad}` }}
      >
        {quotes.map((quote, index) => (
          <Blueprint
            as="figure"
            key={index}
            data-reveal=""
            className="m-0 flex flex-col justify-between gap-7 bg-neutral-100 p-7"
            style={delay(index * 110)}
          >
            <blockquote className="m-0 text-[19px] leading-normal">“{quote.quote}”</blockquote>
            <figcaption className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-accent-200 text-sm font-medium text-accent-800">
                {quote.initials}
              </span>
              <span className="flex flex-col text-sm">
                <span className="font-medium">{quote.name}</span>
                <span className="text-neutral-700">{quote.role}</span>
              </span>
            </figcaption>
          </Blueprint>
        ))}
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section
      id="pricing"
      className="mx-auto flex max-w-[1200px] flex-col items-center gap-8"
      style={{ padding: `112px ${pad}` }}
    >
      <div data-reveal="" className="flex flex-col items-center gap-3.5 text-center">
        <span className={kicker}>Pricing</span>
        <h2 className={sectionTitle}>Free to start. Pro when you want more.</h2>
        <span className="text-neutral-800">
          Publish your site for free. Upgrade for every template, your own domain, the contact form
          and analytics, and cancel any time.
        </span>
      </div>
      <Pricing />
    </section>
  );
}

function Faq() {
  return (
    <section
      id="faq"
      className="mx-auto flex max-w-[820px] flex-col gap-7"
      style={{ padding: `0 ${pad} 112px` }}
    >
      <h2 data-reveal="" className={`${sectionTitle} text-center`}>
        Questions
      </h2>
      <div data-reveal="" className="flex flex-col gap-2.5" style={delay(120)}>
        {faq.map(([question, answer], index) => (
          // Native exclusive accordion: one open at a time, no JavaScript needed.
          <details
            key={question}
            name="faq"
            open={index === 0}
            className="group border border-divider bg-neutral-100"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-[18px] text-lg font-medium [&::-webkit-details-marker]:hidden">
              {question}
              <span aria-hidden className="text-[22px] text-accent group-open:hidden">
                +
              </span>
              <span aria-hidden className="hidden text-[22px] text-accent group-open:inline">
                −
              </span>
            </summary>
            <div className="px-5 pb-[18px] text-neutral-800">{answer}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="bg-accent-900 text-bg">
      <div
        className="mx-auto flex max-w-[1000px] flex-col items-center gap-6 text-center"
        style={{ padding: `104px ${pad}` }}
      >
        <h2
          data-reveal=""
          className="m-0 font-heading text-[clamp(48px,6.5vw,88px)] leading-[0.95] font-semibold text-balance uppercase"
        >
          Be the first thing people find.
        </h2>
        <span className="text-[19px] text-accent-200">
          Two minutes of taps. A site you&apos;re proud to send.
        </span>
        <div className="mt-2 flex flex-wrap justify-center gap-2.5">
          {heroRoles.map((role) => (
            <Link
              key={role}
              href={startHref(role)}
              className="rounded-[4px] border border-accent-400 px-[18px] py-3 text-base text-bg no-underline transition-[transform,background] duration-200 ease-industry hover:-translate-y-0.5 hover:bg-accent-800 hover:text-bg"
            >
              {role}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "CEOMaker",
    url: "/",
    title: "CEOMaker: personal websites for leaders",
    description:
      "Answer a few questions. CEOMaker drafts a polished personal site in your voice, and it goes live at your own address in minutes.",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            productStructuredData(appUrl(), PRO_PRICES.monthly.amount, PRO_PRICES.annual.amount),
          ),
        }}
      />
      <Header />
      <main>
        <Hero />
        <BuiltFor />
        <Problem />
        <HowItWorks />
        <TemplatesSection />
        <Alternatives />
        <Testimonials />
        <PricingSection />
        <Faq />
        <Closing />
      </main>
      <Footer />
      <RevealOnScroll />
    </div>
  );
}
