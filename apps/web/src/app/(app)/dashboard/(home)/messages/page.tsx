import {
  countContactMessages,
  getDb,
  getPrimarySiteForOwner,
  listContactMessages,
} from "@ceomaker/db";
import { parseSiteContentForRender } from "@ceomaker/schema";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type CSSProperties } from "react";
import { Inbox as InboxIcon } from "@/components/icons";
import { Blueprint } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { isUuid, toEditableDraft } from "@/lib/site-data";
import { countLabel, emptyInbox } from "../_components/inbox";
import { Inbox } from "./inbox";
import { toInboxMessage } from "./inbox-data";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function delay(ms: number): CSSProperties {
  return { "--delay": `${ms}ms` } as CSSProperties;
}

function Main({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 pt-6 pb-16 sm:px-10 sm:pt-10 sm:pb-24">
      {children}
    </main>
  );
}

function Title({ count }: { count?: string }) {
  return (
    <div
      className="cm-enter flex flex-wrap items-baseline gap-x-[18px] gap-y-1.5"
      style={delay(40)}
    >
      <h1 className="m-0 font-heading text-[40px] leading-none font-semibold uppercase sm:text-[56px]">
        Messages
      </h1>
      {count ? <span className="text-base text-neutral-700">{count}</span> : null}
    </div>
  );
}

function EmptyCard({
  text,
  action,
}: {
  text: string;
  action: { label: string; href: string; external?: boolean };
}) {
  return (
    <div className="cm-enter" style={delay(100)}>
      <Blueprint className="flex flex-col items-start gap-4 px-5 py-7 sm:p-10">
        <span className="flex text-accent-700">
          <InboxIcon size={32} />
        </span>
        <span className="max-w-[560px] text-[19px] leading-normal text-pretty">{text}</span>
        {action.external ? (
          <a
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary min-h-11 px-4 sm:min-h-10"
          >
            {action.label}
          </a>
        ) : (
          <Link href={action.href} className="btn btn-secondary min-h-11 px-4 sm:min-h-10">
            {action.label}
          </Link>
        )}
      </Blueprint>
    </div>
  );
}

async function Messages({ searchParams }: { searchParams: SearchParams }) {
  const [session, query] = await Promise.all([getSession(), searchParams]);
  if (!session) redirect("/sign-in?callbackURL=/dashboard/messages");
  const db = getDb();
  const site = await getPrimarySiteForOwner(db, session.user.id);
  if (!site) {
    return (
      <Main>
        <Title />
        <EmptyCard
          text="Messages from your contact form appear here once you have a live site."
          action={{ label: "Start building", href: "/start" }}
        />
      </Main>
    );
  }

  const userId = session.user.id;
  const counts = await countContactMessages(db, { userId, siteId: site.id });
  // Topics the live site offers, in its order, then any older ones messages still carry.
  const live = site.published ? toEditableDraft(site.published) : null;
  const contact = live
    ? parseSiteContentForRender(live.content).sections.find((section) => section.type === "contact")
    : undefined;
  const offered = contact?.type === "contact" ? (contact.form?.topics ?? []) : [];
  const topics = [
    ...offered.filter((topic) => topic in counts.topics),
    ...Object.keys(counts.topics).filter((topic) => !offered.includes(topic)),
  ];
  const requested = typeof query.topic === "string" ? query.topic : null;
  const topic = requested && topics.includes(requested) ? requested : null;
  const open = typeof query.open === "string" && isUuid(query.open) ? query.open : null;
  const page = await listContactMessages(db, { userId, siteId: site.id, topic });
  const empty = emptyInbox(site, counts.total > 0);

  return (
    <Main>
      <Title count={counts.total ? countLabel(counts.total, counts.unread) : undefined} />
      {counts.total > 1 && topics.length ? (
        <div
          role="group"
          aria-label="Filter by topic"
          className="cm-enter -mx-5 flex gap-2 overflow-x-auto px-5 pt-0.5 pb-1.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
          style={delay(100)}
        >
          {[null, ...topics].map((name) => {
            const on = name === topic;
            return (
              <Link
                key={name ?? "all"}
                href={
                  name
                    ? `/dashboard/messages?topic=${encodeURIComponent(name)}`
                    : "/dashboard/messages"
                }
                aria-current={on ? "true" : undefined}
                scroll={false}
                className="flex min-h-11 flex-none items-center gap-2 rounded px-3.5 text-sm whitespace-nowrap text-text no-underline transition-[border-color,background,transform] duration-200 hover:-translate-y-0.5 hover:border-accent hover:text-text sm:min-h-[38px]"
                style={{
                  border: `1px solid ${on ? "var(--color-accent)" : "var(--color-divider)"}`,
                  background: on ? "var(--color-accent-100)" : "var(--color-bg)",
                }}
              >
                {name ?? "All"}
                <span className="text-[13px] text-neutral-700 tabular-nums">
                  {name ? counts.topics[name] : counts.total}
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
      {empty ? (
        <EmptyCard text={empty.text} action={empty.action} />
      ) : page.rows.length === 0 ? (
        <div className="cm-enter" style={delay(160)}>
          <Blueprint className="flex flex-col items-start gap-4 px-5 py-7 sm:p-10">
            <span className="max-w-[560px] text-[19px] leading-normal">
              No messages about {topic} yet.
            </span>
            <Link
              href="/dashboard/messages"
              className="btn btn-secondary min-h-11 px-4 sm:min-h-10"
            >
              Show all messages
            </Link>
          </Blueprint>
        </div>
      ) : (
        <div className="cm-enter flex flex-col gap-6" style={delay(160)}>
          <Inbox
            key={topic ?? "all"}
            siteId={site.id}
            topic={topic}
            total={topic ? (counts.topics[topic] ?? 0) : counts.total}
            initial={page.rows.map(toInboxMessage)}
            initialCursor={page.nextCursor}
            open={open}
          />
        </div>
      )}
    </Main>
  );
}

function MessagesSkeleton() {
  return (
    <Main>
      <h1 className="m-0 font-heading text-[40px] leading-none font-semibold uppercase sm:text-[56px]">
        Messages
      </h1>
      <Blueprint className="bg-neutral-100" aria-busy="true" aria-label="Loading messages">
        {[
          ["92%", "64%"],
          ["86%", "40%"],
          ["95%", "72%"],
          ["70%", "30%"],
        ].map(([first, second], index) => (
          <div
            key={index}
            className="flex flex-col gap-3 border-t border-divider px-[18px] py-5 first:border-t-0 sm:px-7 sm:py-6"
          >
            <div className="flex items-center gap-3">
              <span className="cm-shimmer block h-3.5 w-[140px] bg-neutral-200" />
              <span className="cm-shimmer block h-[18px] w-[90px] rounded-[3px] bg-neutral-200" />
              <span className="cm-shimmer ml-auto block h-3 w-20 bg-neutral-200" />
            </div>
            <span className="cm-shimmer block h-3 bg-neutral-200" style={{ width: first }} />
            <span className="cm-shimmer block h-3 bg-neutral-200" style={{ width: second }} />
          </div>
        ))}
      </Blueprint>
    </Main>
  );
}

export default function MessagesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<MessagesSkeleton />}>
      <Messages searchParams={searchParams} />
    </Suspense>
  );
}
