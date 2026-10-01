import {
  ADDRESS_HOLD_DAYS,
  getDb,
  getPrimarySiteForOwner,
  listContactMessages,
} from "@ceomaker/db";
import { parseSiteContentForRender, resolveSiteColors } from "@ceomaker/schema";
import { getTemplate, newerDesign, TemplateView } from "@ceomaker/templates";
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
import { DeleteSite } from "./delete-site";
import { MessageList } from "./messages";
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

/** Streams in after the site card, so a long inbox never holds up the page. */
async function Inbox({ userId, siteId, empty }: { userId: string; siteId: string; empty: string }) {
  const rows = await listContactMessages(getDb(), { userId, siteId });
  return (
    <MessageList
      rows={rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))}
      empty={empty}
    />
  );
}

function InboxSkeleton() {
  return (
    <Blueprint className="flex flex-col gap-2.5 p-5" aria-busy="true" aria-label="Loading messages">
      <span className="h-4 w-48 bg-neutral-200 motion-safe:animate-pulse" />
      <span className="h-3.5 w-full max-w-[520px] bg-neutral-200 motion-safe:animate-pulse" />
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
  const template = getTemplate(shown.templateKey, shown.templateVersion);
  const draft = toEditableDraft(site.draft);
  // Redesigns never reach a live site on their own; say when there's one to look at.
  const newer = newerDesign(draft.templateKey, draft.templateVersion);
  const draftOnNewerDesign =
    site.published !== null &&
    draft.templateKey === shown.templateKey &&
    draft.templateVersion > shown.templateVersion;
  const address = siteAddressParts();
  const live = site.status === "published";
  const url = siteUrl(site.subdomain);
  const statusLabel = live ? "Live" : site.status === "paused" ? "Paused" : "Draft";
  const words = name.toLowerCase().match(/\p{L}+/gu) ?? [];
  const shownContact = parseSiteContentForRender(shown.content).sections.find(
    (section) => section.type === "contact",
  );
  const formOff = shownContact?.type === "contact" && shownContact.form?.enabled === false;
  const inboxEmpty = !live
    ? "Messages from your contact form appear here once your site is live."
    : !template.contactForm
      ? `The ${template.name} template has no contact form. Meridian has one: switch in the editor to get messages here.`
      : formOff
        ? "Your contact form is off. Turn it on in the editor, under Contact, to get messages here."
        : "No messages yet. When someone writes through the form on your site, it appears here.";

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
              templateVersion={shown.templateVersion}
              colors={resolveSiteColors(shown.theme, shown.templateKey, shown.templateVersion)}
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
                {statusLabel} · {template.name} template
              </span>
              {newer || draftOnNewerDesign ? (
                <span className="text-[13px] text-neutral-700">
                  {newer
                    ? `${newer.name} has a new design. Preview it in the editor; your site keeps its look until you publish.`
                    : `Your draft uses the new ${template.name} design. It goes live when you publish.`}
                </span>
              ) : null}
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
      <section id="messages" data-reveal="" className="flex flex-col gap-3" style={delay(100)}>
        <h2 className="m-0 font-heading text-[28px] leading-none font-semibold uppercase">
          Messages
        </h2>
        <Suspense fallback={<InboxSkeleton />}>
          <Inbox userId={session.user.id} siteId={site.id} empty={inboxEmpty} />
        </Suspense>
      </section>
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
            templateName: getTemplate(version.templateKey, version.templateVersion).name,
            isCurrent: version.isCurrent,
          }))}
        />
      </section>
      <section data-reveal="" className="flex flex-col gap-3" style={delay(160)}>
        <h2 className="m-0 font-heading text-[28px] leading-none font-semibold uppercase">
          Delete site
        </h2>
        <Blueprint className="flex flex-wrap items-center gap-4 p-5">
          <span className="min-w-[240px] flex-1 text-sm text-neutral-700">
            Takes your site offline and deletes its draft, published versions and photos. Your
            account stays, and you can start a new site.
          </span>
          <DeleteSite
            siteId={site.id}
            subdomain={site.subdomain}
            address={`${address.prefix}${site.subdomain}${address.suffix}`}
            everPublished={site.versions.length > 0}
            holdDays={ADDRESS_HOLD_DAYS}
          />
        </Blueprint>
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
