import { tenantUrl } from "@/lib/routing";
import { ButtonLink, Container, Wordmark } from "./components";

const steps = [
  {
    title: "Tell us about you",
    body: "Answer a short guided form, or upload your CV to skip most of it. Nothing is published yet.",
  },
  {
    title: "Review your draft",
    body: "CEOMaker writes a first version in a measured, professional voice. Edit any line, colour or section order.",
  },
  {
    title: "Publish",
    body: "Your site goes live at yourname.ceomaker.com, fast on every phone and laptop. Your own domain is coming soon.",
  },
];

const included = [
  "yourname.ceomaker.com address",
  "AI-drafted copy you can edit freely",
  "Templates designed for executives",
  "Mobile-first, fast everywhere",
  "Visitor analytics (coming soon)",
  "Your own domain (coming soon)",
];

function SitePreview() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_24px_60px_-20px_rgba(22,24,29,0.25)]"
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="size-2.5 rounded-full bg-line" />
        <span className="size-2.5 rounded-full bg-line" />
        <span className="size-2.5 rounded-full bg-line" />
        <span className="ml-3 truncate rounded bg-paper px-3 py-1 text-xs text-stone">
          amelia.ceomaker.com
        </span>
      </div>
      <div className="bg-paper px-6 py-8 sm:px-8 sm:py-10">
        <p className="flex items-center gap-3 text-[0.65rem] font-medium tracking-[0.16em] text-gold uppercase">
          <span className="h-px w-6 bg-gold-soft" />
          Chief Executive Officer
        </p>
        <p className="mt-4 font-display text-2xl leading-tight font-semibold sm:text-3xl">
          Building supply chains that hold up under pressure.
        </p>
        <div className="mt-4 space-y-2">
          <div className="h-2 w-11/12 rounded bg-ink/10" />
          <div className="h-2 w-9/12 rounded bg-ink/10" />
        </div>
        <div className="mt-6 inline-block rounded bg-navy px-4 py-2 text-[0.7rem] font-semibold text-white">
          Get in touch &rarr;
        </div>
        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-ink/10 pt-5">
          {[
            ["€780M", "Revenue"],
            ["31", "Countries"],
            ["2,400", "People"],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="font-display text-lg font-semibold text-navy">{value}</p>
              <p className="text-[0.65rem] text-stone">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const exampleUrl = tenantUrl(
    "demo",
    process.env.APP_URL ?? "http://localhost:3000",
    process.env.ROOT_DOMAIN ?? "localhost:3000",
  );

  return (
    <>
      <header className="border-b border-line/70">
        <Container className="flex h-16 items-center justify-between">
          <Wordmark />
          <nav aria-label="Account" className="flex items-center gap-2">
            <ButtonLink href="/sign-in" variant="ghost">
              Sign in
            </ButtonLink>
            <ButtonLink href="/sign-up" className="hidden sm:inline-flex">
              Get started
            </ButtonLink>
          </nav>
        </Container>
      </header>

      <main>
        <section className="py-16 sm:py-24">
          <Container className="grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="text-sm font-medium tracking-[0.16em] text-gold uppercase">
                For founders, executives and investors
              </p>
              <h1 className="mt-5 font-display text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl">
                A personal website that matches your standing.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-stone">
                Share your background or upload your CV. CEOMaker drafts a polished site in your
                voice, you refine it, and it goes live at your own address in minutes.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/sign-up">Create your site</ButtonLink>
                <a
                  href={exampleUrl}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold text-navy hover:bg-navy/5"
                >
                  See an example <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>
            <SitePreview />
          </Container>
        </section>

        <section aria-labelledby="how-heading" className="border-t border-line/70 py-16 sm:py-24">
          <Container>
            <h2 id="how-heading" className="font-display text-3xl font-semibold sm:text-4xl">
              Live in three steps
            </h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="border-t border-ink/15 pt-6">
                  <p className="font-display text-sm font-semibold text-gold">0{index + 1}</p>
                  <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-stone">{step.body}</p>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        <section
          aria-labelledby="pricing-heading"
          className="border-t border-line/70 py-16 sm:py-24"
        >
          <Container className="grid gap-10 lg:grid-cols-[1fr_26rem] lg:items-center">
            <div>
              <h2 id="pricing-heading" className="font-display text-3xl font-semibold sm:text-4xl">
                One plan. No surprises.
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-stone">
                Build and preview for free. Pay only when you publish, and cancel any time.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-white p-7 sm:p-8">
              <p className="flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold">$9.99</span>
                <span className="text-stone">/ month</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {included.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden="true" className="text-gold-soft">
                      &#10003;
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/sign-up" className="mt-8 w-full">
                Start building
              </ButtonLink>
            </div>
          </Container>
        </section>
      </main>

      <footer className="border-t border-line/70 py-10 text-sm text-stone">
        <Container className="flex flex-col justify-between gap-3 sm:flex-row">
          <Wordmark />
          <p>Personal websites for people who lead.</p>
        </Container>
      </footer>
    </>
  );
}
