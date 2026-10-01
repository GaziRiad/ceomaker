import {
  countContactMessages,
  getDb,
  getPrimarySiteForOwner,
  listContactMessages,
  type OwnedSite,
} from "@ceomaker/db";
import { parseSiteContentForRender, resolveSiteColors } from "@ceomaker/schema";
import { getTemplate, newerDesign, TemplateView } from "@ceomaker/templates";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ExternalLink, Inbox, Sparkles } from "@/components/icons";
import { ScaledFrame } from "@/components/scaled-frame";
import { ArrowRight, Blueprint } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { siteAddressParts, siteUrl } from "@/lib/routing";
import { displayName, toEditableDraft } from "@/lib/site-data";
import { liveFingerprint } from "../sites/[id]/edit/editor-model";
import { ForgetStartAnswers } from "../../start/forget-answers";
import { enter } from "./_components/enter";
import { countLabel, emptyInbox, snippet } from "./_components/inbox";
import { When } from "./_components/relative-time";
import { Versions } from "./_components/versions";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

const PREVIEW_DATE = new Date("2026-01-01T00:00:00Z");

function Heading({ first }: { first: string }) {
  return (
    <div {...enter(0)} className="cm-enter flex flex-col gap-1.5">
      <span className="kicker">Welcome back, {first}</span>
      <h1 className="m-0 font-heading text-[40px] leading-none font-semibold uppercase sm:text-[56px]">
        Your site
      </h1>
    </div>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-7 px-5 pt-6 pb-16 sm:gap-9 sm:px-10 sm:pt-10 sm:pb-24">
      {children}
    </main>
  );
}

function SiteCard({ site }: { site: OwnedSite }) {
  const shown = toEditableDraft(site.published ?? site.draft);
  const draft = toEditableDraft(site.draft);
  const template = getTemplate(shown.templateKey, shown.templateVersion);
  const address = siteAddressParts();
  const url = siteUrl(site.subdomain);
  const editor = `/dashboard/sites/${site.id}/edit`;
  const isDraft = site.status === "draft" || !site.published;
  const paused = site.status === "paused";
  const changes =
    !isDraft &&
    site.published !== null &&
    liveFingerprint(site.published) !== liveFingerprint(site.draft);
  const newer = newerDesign(draft.templateKey, draft.templateVersion);
  const draftOnNewerDesign =
    !isDraft &&
    draft.templateKey === shown.templateKey &&
    draft.templateVersion > shown.templateVersion;
  const notice = newer
    ? `${newer.name} has a new design. Preview it in the editor; your site keeps its look until you publish.`
    : draftOnNewerDesign
      ? `Your draft uses the new ${template.name} design. It goes live when you publish.`
      : null;
  const line = isDraft
    ? `Draft · not published yet · ${template.name} template`
    : paused
      ? `Paused · offline · ${template.name} template`
      : `Live · ${template.name} template`;

  return (
    <div {...enter(1)} className="cm-enter">
      <Blueprint className="flex min-w-0 flex-col bg-neutral-100">
        <div className="relative border-b border-divider">
          <ScaledFrame
            initialZoom={0.6}
            className="h-[196px] sm:h-[300px]"
            style={{ filter: paused ? "grayscale(1) opacity(.5)" : undefined }}
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
          {isDraft || paused ? (
            <span className="tag tag-neutral absolute top-3.5 left-3.5 shadow-sm">
              {isDraft ? "Preview of your draft" : "Offline · visitors see a 'taking a break' page"}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-4 p-[18px] sm:px-6 sm:py-5">
          <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
            <span className="text-[19px] font-medium [overflow-wrap:anywhere]">
              {address.prefix}
              {site.subdomain}
              {address.suffix}
            </span>
            <span className="flex flex-wrap items-center gap-2 text-sm text-neutral-800">
              <span
                aria-hidden
                className={`size-2 flex-none rounded-full ${isDraft || paused ? "bg-neutral-500" : "cm-blink bg-accent"}`}
              />
              {line}
              {changes ? (
                <span className="tag bg-[#fdf3e2] text-[#7a4b0c]">Unpublished changes</span>
              ) : null}
            </span>
          </div>
          <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
            {isDraft ? (
              <Link
                href={editor}
                className="btn btn-primary min-h-11 flex-1 gap-2.5 px-4 sm:min-h-10 sm:flex-none"
              >
                Continue editing <ArrowRight />
              </Link>
            ) : (
              <>
                <Link
                  href={editor}
                  className="btn btn-secondary min-h-11 flex-1 px-4 sm:min-h-10 sm:flex-none"
                >
                  Edit site
                </Link>
                {paused ? (
                  <Link
                    href="/dashboard/settings/billing"
                    className="btn btn-primary min-h-11 flex-1 gap-2.5 px-4 sm:min-h-10 sm:flex-none"
                  >
                    Billing settings <ArrowRight />
                  </Link>
                ) : (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary min-h-11 flex-1 gap-2.5 px-4 sm:min-h-10 sm:flex-none"
                  >
                    View site <ExternalLink size={16} />
                  </a>
                )}
              </>
            )}
          </div>
        </div>
        {notice ? (
          <div className="mx-[18px] mb-[18px] flex flex-wrap items-start gap-x-3 gap-y-2.5 border border-accent-200 bg-accent-100 px-4 py-3.5 sm:mx-6 sm:mb-6">
            <span className="flex pt-0.5 text-accent-700">
              <Sparkles />
            </span>
            <span className="flex-[1_1_220px] text-[15px] leading-normal text-pretty text-accent-900">
              {notice}
            </span>
            {newer ? (
              <Link href={editor} className="btn btn-ghost -my-1.5 min-h-10 text-accent-700">
                Preview in editor
              </Link>
            ) : null}
          </div>
        ) : null}
      </Blueprint>
    </div>
  );
}

function SideCards({ words }: { words: string[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div {...enter(2)} className="cm-enter">
        <Blueprint className="flex flex-col gap-2 p-[22px]">
          <span className="flex items-center justify-between gap-2.5">
            <span className="kicker">Plan</span>
            <span className="tag tag-accent">Private beta</span>
          </span>
          <span className="font-heading text-[28px] leading-[1.05] font-semibold uppercase">
            Beta · Free
          </span>
          <span className="text-[15px] text-pretty text-neutral-800">
            Free during the private beta. We&apos;ll email you before anything changes.
          </span>
          <Link
            href="/dashboard/settings/billing"
            className="btn btn-ghost min-h-11 self-start pl-0 text-accent-700 sm:min-h-10"
          >
            Billing settings
          </Link>
        </Blueprint>
      </div>
      <div {...enter(3)} className="cm-enter">
        <Blueprint className="flex flex-col gap-2 p-[22px]">
          <span className="flex items-center justify-between gap-2.5">
            <span className="kicker">Custom domain</span>
            <span className="tag tag-neutral">Coming soon</span>
          </span>
          <span className="font-heading text-[28px] leading-[1.05] font-semibold uppercase">
            Your own domain
          </span>
          <span className="text-[15px] text-neutral-800">
            Connect a domain you own, like {words.length ? words.join("") : "yourname"}.com.
          </span>
        </Blueprint>
      </div>
    </div>
  );
}

async function MessagesCard({ site, userId }: { site: OwnedSite; userId: string }) {
  const db = getDb();
  const [counts, newest] = await Promise.all([
    countContactMessages(db, { userId, siteId: site.id }),
    listContactMessages(db, { userId, siteId: site.id, limit: 3 }),
  ]);
  const empty = emptyInbox(site, counts.total > 0);
  return (
    <section {...enter(4)} aria-label="Messages" className="cm-enter">
      <Blueprint className="bg-neutral-100">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 border-b border-divider p-[18px] sm:px-6 sm:py-5">
          <h2 className="m-0 font-heading text-[28px] leading-none font-semibold uppercase">
            Messages
          </h2>
          {counts.total ? (
            <span className="text-[15px] text-neutral-700">
              {countLabel(counts.total, counts.unread)}
            </span>
          ) : null}
          {counts.total ? (
            <Link
              href="/dashboard/messages"
              className="btn btn-ghost ml-auto min-h-11 gap-2 text-accent-700 sm:min-h-10"
            >
              View all messages <ArrowRight />
            </Link>
          ) : null}
        </div>
        {empty ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-4 px-[18px] py-6 sm:px-6 sm:py-7">
            <span className="flex text-accent-700">
              <Inbox size={22} />
            </span>
            <span className="max-w-[620px] flex-[1_1_260px] text-pretty text-neutral-800">
              {empty.text}
            </span>
            {empty.action.external ? (
              <a
                href={empty.action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary min-h-11 px-4 sm:min-h-10"
              >
                {empty.action.label}
              </a>
            ) : (
              <Link
                href={empty.action.href}
                className="btn btn-secondary min-h-11 px-4 sm:min-h-10"
              >
                {empty.action.label}
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {newest.rows.map((row) => {
              const unread = !row.readAt;
              return (
                <Link
                  key={row.id}
                  href={`/dashboard/messages?open=${row.id}`}
                  className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1 border-t border-divider px-[18px] py-3.5 text-text no-underline transition-colors [grid-template-areas:'dot_who_time'_'._text_text'] first:border-t-0 hover:bg-neutral-200 hover:text-text sm:grid-cols-[8px_300px_minmax(0,1fr)_96px] sm:px-6 sm:[grid-template-areas:'dot_who_text_time']"
                >
                  <span
                    className="size-2 rounded-full bg-accent [grid-area:dot]"
                    style={{ opacity: unread ? 1 : 0 }}
                  >
                    {unread ? <span className="sr-only">New message</span> : null}
                  </span>
                  <span className="flex min-w-0 items-center gap-2.5 [grid-area:who]">
                    <span className="truncate" style={{ fontWeight: unread ? 600 : 400 }}>
                      {row.name}
                    </span>
                    {row.topic ? (
                      <span className="tag tag-accent hidden flex-none whitespace-nowrap sm:inline-flex">
                        {row.topic}
                      </span>
                    ) : null}
                  </span>
                  <span className="min-w-0 truncate text-[15px] text-neutral-800 [grid-area:text]">
                    {snippet(row.message)}
                  </span>
                  <span className="justify-self-end text-[13px] whitespace-nowrap text-neutral-700 [grid-area:time]">
                    <When iso={row.createdAt.toISOString()} style="relative" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Blueprint>
    </section>
  );
}

async function Overview() {
  const session = await getSession();
  if (!session) redirect("/sign-in?callbackURL=/dashboard");
  const site = await getPrimarySiteForOwner(getDb(), session.user.id);
  const name = displayName(session.user, site?.answers?.name);
  const first = name.split(/\s+/)[0] ?? name;

  if (!site) {
    return (
      <Main>
        <Heading first={first} />
        <div {...enter(1)} className="cm-enter">
          <Blueprint className="flex max-w-[640px] flex-col gap-4 bg-neutral-100 p-8">
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
        </div>
      </Main>
    );
  }

  const words = name.toLowerCase().match(/\p{L}+/gu) ?? [];
  return (
    <Main>
      <ForgetStartAnswers />
      <Heading first={first} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <SiteCard site={site} />
        <SideCards words={words} />
      </div>
      <Suspense fallback={<MessagesSkeleton />}>
        <MessagesCard site={site} userId={session.user.id} />
      </Suspense>
      <section
        {...enter(5)}
        aria-label="Published versions"
        className="cm-enter flex flex-col gap-3"
      >
        <h2 className="m-0 font-heading text-[28px] leading-none font-semibold uppercase">
          Published versions
        </h2>
        {site.versions.length ? (
          <Versions
            siteId={site.id}
            rows={site.versions.map((version) => {
              // The design it renders with: a version we no longer have shows as the oldest.
              const template = getTemplate(version.templateKey, version.templateVersion);
              return {
                id: version.id,
                number: version.number,
                publishedAt: version.publishedAt.toISOString(),
                template: `${template.name} · design ${template.version}`,
                isCurrent: version.isCurrent,
              };
            })}
          />
        ) : (
          <p className="m-0 text-neutral-800">
            Nothing published yet. A version is saved each time you publish, so you can go back to
            it.
          </p>
        )}
      </section>
    </Main>
  );
}

function Shimmer({ className }: { className: string }) {
  return <span className={`cm-shimmer block bg-neutral-200 ${className}`} />;
}

function MessagesSkeleton() {
  return <Shimmer className="h-[200px]" />;
}

/** Painted from the static shell while the session and site load. */
function OverviewSkeleton() {
  return (
    <Main>
      <div className="flex flex-col gap-1.5" aria-busy="true" aria-label="Loading your site">
        <Shimmer className="h-4 w-40" />
        <span className="m-0 font-heading text-[40px] leading-none font-semibold uppercase sm:text-[56px]">
          Your site
        </span>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-3.5">
          <Shimmer className="h-[196px] sm:h-[300px]" />
          <Shimmer className="h-[18px] w-[46%]" />
          <Shimmer className="h-3 w-[30%]" />
        </div>
        <div className="flex flex-col gap-6">
          <Shimmer className="h-[150px]" />
          <Shimmer className="h-[150px]" />
        </div>
      </div>
      <Shimmer className="h-[260px]" />
    </Main>
  );
}

export default function OverviewPage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview />
    </Suspense>
  );
}
