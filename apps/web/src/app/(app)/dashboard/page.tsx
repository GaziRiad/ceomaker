import { getDb, getPrimarySiteForOwner } from "@ceomaker/db";
import { parseSiteContentForRender, resolveSiteColors } from "@ceomaker/schema";
import { getTemplate, TemplateView } from "@ceomaker/templates";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { Suspense } from "react";
import { RevealOnScroll } from "@/components/reveal";
import { ScaledFrame } from "@/components/scaled-frame";
import { ArrowRight, Avatar, Blueprint, Wordmark } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { siteAddressParts, siteUrl } from "@/lib/routing";
import { initialsFor, toEditableDraft } from "@/lib/site-data";
import { ForgetStartAnswers } from "../start/forget-answers";
import { SignOutButton } from "./sign-out-button";
import { VersionsTable } from "./versions-table";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

const PREVIEW_DATE = new Date("2026-01-01T00:00:00Z");

function delay(ms: number): CSSProperties {
  return { "--delay": `${ms}ms` } as CSSProperties;
}

function Shell({
  email,
  initials,
  children,
}: {
  /** Omitted by the loading skeleton, which has no session yet. */
  email?: string;
  initials?: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="border-b border-divider bg-neutral-100">
        <div
          className="mx-auto flex h-16 max-w-[1200px] items-center gap-5 text-[15px]"
          style={{ paddingInline: "clamp(20px,3vw,32px)" }}
        >
          <Link href="/" className="text-text no-underline hover:text-text">
            <Wordmark />
          </Link>
          {email && initials ? (
            <>
              <span className="ml-auto hidden text-sm text-neutral-700 sm:inline">{email}</span>
              <SignOutButton />
              <Avatar initials={initials} />
            </>
          ) : null}
        </div>
      </header>
      <main
        className="mx-auto flex max-w-[1200px] flex-col gap-8"
        style={{ padding: "48px clamp(20px,3vw,32px) 96px" }}
      >
        {children}
      </main>
      <RevealOnScroll />
    </>
  );
}

function SideCard({
  kicker,
  title,
  children,
  delayMs,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
  delayMs: number;
}) {
  return (
    <Blueprint className="cm-rise flex flex-col gap-1.5 p-5" style={delay(delayMs)}>
      <span className="kicker">{kicker}</span>
      <span className="font-heading text-[28px] leading-tight font-semibold uppercase">
        {title}
      </span>
      {children}
    </Blueprint>
  );
}

async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const site = await getPrimarySiteForOwner(getDb(), session.user.id);

  const name = site?.answers?.name || session.user.name;
  const first = name.trim().split(/\s+/)[0] || "there";
  const initials = initialsFor(name, session.user.email);
  const heading = (
    <div className="cm-rise flex flex-col gap-1.5">
      <span className="kicker">Welcome back, {first}</span>
      <h1 className="m-0 font-heading text-[clamp(40px,4.5vw,56px)] leading-none font-semibold uppercase">
        Your site
      </h1>
    </div>
  );

  if (!site) {
    return (
      <Shell email={session.user.email} initials={initials}>
        {heading}
        <Blueprint
          className="cm-rise flex max-w-[640px] flex-col gap-4 bg-neutral-100 p-8"
          style={delay(80)}
        >
          <span className="font-heading text-[28px] font-semibold uppercase">No site yet</span>
          <span className="text-neutral-800">
            Answer a few questions and CEOMaker drafts your site in your voice. It stays private
            until you publish.
          </span>
          <Link
            href="/start"
            className="btn btn-primary self-start"
            style={{ minWidth: 240, justifyContent: "space-between", padding: "12px 16px" }}
          >
            Start building <ArrowRight />
          </Link>
        </Blueprint>
      </Shell>
    );
  }

  const shown = toEditableDraft(site.published ?? site.draft);
  const address = siteAddressParts();
  const live = site.status === "published";
  const url = siteUrl(site.subdomain);
  const statusLabel = live ? "Live" : site.status === "paused" ? "Paused" : "Draft";
  const words = name.toLowerCase().match(/\p{L}+/gu) ?? [];

  return (
    <Shell email={session.user.email} initials={initials}>
      <ForgetStartAnswers />
      {heading}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-6">
        <Blueprint
          className="cm-rise flex min-w-0 flex-col bg-neutral-100 md:col-span-2"
          style={delay(80)}
        >
          <ScaledFrame
            initialZoom={0.5}
            className="border-b border-divider"
            style={{ height: 280 }}
          >
            <TemplateView
              templateKey={shown.templateKey}
              colors={resolveSiteColors(shown.theme, shown.templateKey)}
              content={parseSiteContentForRender(shown.content)}
              publishedAt={PREVIEW_DATE}
              preview
              still
            />
          </ScaledFrame>
          <div className="flex flex-wrap items-center gap-3" style={{ padding: "16px 18px" }}>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-[17px] font-medium">
                {address.prefix}
                {site.subdomain}
                {address.suffix}
              </span>
              <span className="flex items-center gap-2 text-[13px] text-accent-700">
                <span className={`size-[7px] rounded-full bg-accent ${live ? "cm-pulse" : ""}`} />
                {statusLabel} · {getTemplate(shown.templateKey).name} template
              </span>
            </div>
            <Link href={`/dashboard/sites/${site.id}/edit`} className="btn btn-secondary">
              Edit site
            </Link>
            {live ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ gap: 10 }}
              >
                View site <ArrowRight />
              </a>
            ) : null}
          </div>
        </Blueprint>
        <div className="flex flex-col gap-6">
          <SideCard kicker="Plan" title="Beta · Free" delayMs={160}>
            <span className="text-sm text-neutral-700">
              Billing starts after the private beta. We&apos;ll email you before anything changes.
            </span>
          </SideCard>
          <SideCard kicker="Custom domain" title="Coming soon" delayMs={240}>
            <span className="text-sm text-neutral-700">
              Connect a domain you own, like {words.length ? words.join("") : "yourname"}.com.
            </span>
          </SideCard>
        </div>
      </div>
      <section data-reveal="" className="flex flex-col gap-3" style={delay(120)}>
        <h2 className="m-0 font-heading text-[28px] leading-none font-semibold uppercase">
          Published versions
        </h2>
        <VersionsTable
          siteId={site.id}
          rows={site.versions.map((version) => ({
            id: version.id,
            number: version.number,
            publishedAt: version.publishedAt.toISOString(),
            templateName: getTemplate(version.templateKey).name,
            isCurrent: version.isCurrent,
          }))}
        />
      </section>
    </Shell>
  );
}

/** Painted from the static shell while the session and site load. */
function DashboardSkeleton() {
  const block = "bg-neutral-200 motion-safe:animate-pulse";
  return (
    <Shell>
      <div className="flex flex-col gap-1.5" aria-busy="true" aria-label="Loading your site">
        <span className={`${block} h-4 w-40`} />
        <span className="m-0 font-heading text-[clamp(40px,4.5vw,56px)] leading-none font-semibold uppercase">
          Your site
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-6">
        <Blueprint className="flex min-w-0 flex-col bg-neutral-100 md:col-span-2">
          <span className={`${block} h-[280px] border-b border-divider`} />
          <div className="flex flex-col gap-2" style={{ padding: "16px 18px" }}>
            <span className={`${block} h-5 w-64 max-w-full`} />
            <span className={`${block} h-3.5 w-40`} />
          </div>
        </Blueprint>
        <div className="flex flex-col gap-6">
          {[0, 1].map((index) => (
            <Blueprint key={index} className="flex flex-col gap-2.5 p-5">
              <span className={`${block} h-3.5 w-24`} />
              <span className={`${block} h-7 w-40`} />
              <span className={`${block} h-3.5 w-full`} />
            </Blueprint>
          ))}
        </div>
      </div>
    </Shell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
