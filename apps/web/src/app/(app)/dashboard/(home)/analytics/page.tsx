import {
  getAnalyticsReport,
  getDb,
  getPrimarySiteForOwner,
  getSiteDomain,
  type OwnedSite,
} from "@ceomaker/db";
import { ANALYTICS_RANGES, type AnalyticsRange } from "@ceomaker/schema";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type CSSProperties, type ReactNode } from "react";
import {
  Alert,
  Chart,
  Globe,
  LinkedIn,
  LinkIcon,
  Phone,
  Search,
  Send,
  Shield,
  Trend,
  TrendDown,
} from "@/components/icons";
import { ArrowRight, Blueprint, Mail } from "@/components/ui";
import { VisitorMap } from "@/components/visitor-map";
import {
  CLICK_LABELS,
  reportView,
  type Change,
  type ReportView,
} from "@/lib/analytics/report-view";
import { getSession } from "@/lib/auth";
import { siteUrl } from "@/lib/routing";
import { enter } from "../_components/enter";
import { When } from "../_components/relative-time";
import { Geography } from "./geo";
import { RetryButton, ShareSite } from "./share-link";

export const metadata: Metadata = { title: "Analytics", robots: { index: false } };

type Search = Promise<Record<string, string | string[] | undefined>>;

function rangeOf(value: unknown): AnalyticsRange {
  const number = Number(value);
  return (ANALYTICS_RANGES as readonly number[]).includes(number) ? (number as AnalyticsRange) : 30;
}

function Main({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-7 px-5 pt-6 pb-16 sm:gap-9 sm:px-10 sm:pt-10 sm:pb-24">
      {children}
    </main>
  );
}

function Heading({ children }: { children?: ReactNode }) {
  return (
    <div
      {...enter(0)}
      className="cm-enter flex flex-wrap items-end justify-between gap-x-6 gap-y-4"
    >
      <h1 className="m-0 font-heading text-[40px] leading-none font-semibold uppercase sm:text-[56px]">
        Analytics
      </h1>
      {children}
    </div>
  );
}

function Ranges({ current }: { current: AnalyticsRange }) {
  return (
    <nav aria-label="Date range" className="seg grid w-full grid-cols-3 sm:w-[360px]">
      {ANALYTICS_RANGES.map((range) => (
        <Link
          key={range}
          href={`/dashboard/analytics?range=${range}`}
          scroll={false}
          aria-current={range === current ? "page" : undefined}
          className="seg-opt min-h-11 justify-center text-[15px] whitespace-nowrap text-text no-underline hover:text-text sm:min-h-10"
        >
          {range} days
        </Link>
      ))}
    </nav>
  );
}

const H2 = "m-0 font-heading text-[28px] leading-[1.05] font-semibold uppercase";
const CARD = "p-[18px] sm:px-6 sm:py-5";

function Card({
  index,
  label,
  className = "",
  children,
}: {
  index: number;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section {...enter(index)} aria-label={label} className="cm-enter min-w-0">
      <Blueprint className={`flex min-w-0 flex-col ${CARD} ${className}`}>{children}</Blueprint>
    </section>
  );
}

function ChangeLine({ change, note }: { change: Change | null; note: string }) {
  if (!change) return <span className="text-sm leading-[1.4] text-neutral-700">{note}</span>;
  return (
    <span
      className={`flex items-start gap-1.5 text-sm leading-[1.4] ${change.direction === "up" ? "text-accent-700" : "text-neutral-700"}`}
    >
      {change.direction === "up" ? (
        <span className="flex flex-none pt-px">
          <Trend size={16} />
        </span>
      ) : change.direction === "down" ? (
        <span className="flex flex-none pt-px">
          <TrendDown size={16} />
        </span>
      ) : null}
      {change.text}
    </span>
  );
}

function Tiles({ view }: { view: ReportView }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-6 min-[1040px]:grid-cols-4">
      {view.tiles.map((tile, index) => (
        <div key={tile.label} {...enter(2 + index)} className="cm-enter min-w-0">
          <Blueprint className="flex h-full min-w-0 flex-col gap-1.5 p-4 sm:px-[22px] sm:py-5">
            <span className="kicker">{tile.label}</span>
            <span className="mt-auto truncate font-heading text-[34px] leading-none font-semibold uppercase sm:text-[44px]">
              {tile.value}
            </span>
            <ChangeLine change={tile.change} note={tile.note} />
          </Blueprint>
        </div>
      ))}
    </div>
  );
}

function VisitsChart({ chart }: { chart: NonNullable<ReportView["chart"]> }) {
  const dense = chart.bars.length > 20;
  return (
    <>
      <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5">
        <div
          aria-hidden
          className="flex h-[170px] flex-col items-end justify-between text-xs leading-none text-neutral-700 tabular-nums sm:h-[240px]"
        >
          <span>{chart.top}</span>
          <span>{chart.top / 2}</span>
          <span>0</span>
        </div>
        <div className="relative h-[170px] sm:h-[240px]">
          <span className="absolute inset-x-0 top-0 border-t border-dashed border-divider" />
          <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-divider" />
          <span className="absolute inset-x-0 bottom-0 border-t border-divider" />
          <div
            role="list"
            aria-label={chart.aria}
            className={`absolute inset-0 flex items-end ${dense ? "gap-0.5 sm:gap-[5px]" : "gap-1.5 sm:gap-3.5"}`}
          >
            {chart.bars.map((bar, index) => (
              <div
                key={index}
                role="listitem"
                title={bar.tip}
                aria-label={bar.tip}
                className="flex h-full min-w-0 flex-1 items-end"
              >
                <div
                  className={`cm-bar w-full transition-colors hover:bg-accent-700 ${bar.visitors ? "bg-accent" : "bg-neutral-300"}`}
                  style={
                    {
                      height: bar.visitors
                        ? `${Math.max(2, (bar.visitors / chart.top) * 100)}%`
                        : "2px",
                      "--delay": `${160 + index * 12}ms`,
                    } as CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </div>
        <span />
        <div aria-hidden className="flex justify-between text-xs text-neutral-700">
          {chart.axis.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </div>
      {chart.busiest ? <span className="text-[15px] text-neutral-800">{chart.busiest}</span> : null}
    </>
  );
}

function Breakdowns({ view }: { view: ReportView }) {
  const icons = {
    linkedin: <LinkedIn size={16} />,
    google: <Search size={16} />,
    direct: <LinkIcon size={16} />,
    email: <Mail size={16} />,
    other: <Globe size={16} />,
  } as const;
  return (
    <>
      <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
        <Card index={7} label="Where visitors came from" className="gap-4">
          <h2 className={H2}>Where visitors came from</h2>
          {view.sources.map((source) => (
            <div key={source.key} className="flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-3 text-[15px]">
                <span className="flex min-w-0 items-start gap-2.5">
                  <span className="flex flex-none pt-0.5 text-neutral-700">
                    {icons[source.key]}
                  </span>
                  <span className="flex flex-col">
                    <span>{source.label}</span>
                    {source.note ? (
                      <span className="text-[13px] text-neutral-700">{source.note}</span>
                    ) : null}
                  </span>
                </span>
                <span className="whitespace-nowrap tabular-nums">
                  <span className="font-medium">{source.visitors}</span>
                  <span className="text-neutral-700"> · {source.percent}</span>
                </span>
              </div>
              <span className="block h-2 bg-neutral-200">
                <span
                  className="cm-hbar block h-full bg-accent"
                  style={{ width: `${source.share * 100}%` }}
                />
              </span>
              {source.sub.length ? (
                <div className="flex flex-col gap-1 pt-1 pl-7">
                  {source.sub.map((site) => (
                    <div
                      key={site.host}
                      className="flex justify-between gap-3 text-sm text-neutral-800"
                    >
                      <span className="[overflow-wrap:anywhere]">{site.host}</span>
                      <span className="tabular-nums">{site.visitors}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </Card>
        <Card index={8} label="What visitors did" className="gap-1.5">
          <h2 className={`${H2} mb-2`}>What visitors did</h2>
          {view.actions.length
            ? view.actions.map((action) => (
                <div
                  key={action.key}
                  className="flex items-center gap-3 border-b border-divider py-2.5 text-[15px]"
                >
                  <span className="flex flex-none text-neutral-700">
                    {ACTION_ICONS[action.key]}
                  </span>
                  <span className="min-w-0 flex-1">{CLICK_LABELS[action.key]}</span>
                  <span className="font-medium tabular-nums">{action.count}</span>
                </div>
              ))
            : null}
          {view.mode === "few" || !view.actions.length ? (
            <span className="pt-2 text-sm text-neutral-700">
              Clicks on your email, LinkedIn and phone number appear here as they happen.
            </span>
          ) : null}
        </Card>
      </div>
      <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
        <Card index={9} label="Pages" className="gap-3">
          <h2 className={H2}>Pages</h2>
          <div role="table" aria-label="Views per page" className="flex flex-col">
            <div
              role="row"
              className="grid grid-cols-[minmax(0,1fr)_56px_68px] gap-3 border-b border-divider py-2 text-xs tracking-[0.08em] text-neutral-700 uppercase sm:grid-cols-[minmax(0,1fr)_90px_90px]"
            >
              <span role="columnheader">Page</span>
              <span role="columnheader" className="text-right">
                Views
              </span>
              <span role="columnheader" className="text-right">
                Visitors
              </span>
            </div>
            {view.pages.map((page) => (
              <div
                role="row"
                key={page.path}
                className="grid grid-cols-[minmax(0,1fr)_56px_68px] items-center gap-3 border-b border-divider py-3 sm:grid-cols-[minmax(0,1fr)_90px_90px]"
              >
                <span role="cell" className="flex min-w-0 flex-col">
                  <span className="font-medium">{page.name}</span>
                  <span className="text-[13px] text-neutral-700">{page.path}</span>
                </span>
                <span role="cell" className="text-right tabular-nums">
                  {page.views}
                </span>
                <span role="cell" className="text-right tabular-nums">
                  {page.visitors}
                </span>
              </div>
            ))}
          </div>
          <span className="text-sm text-neutral-700">
            Sub-pages and posts appear here when you add them.
          </span>
        </Card>
        <Card index={10} label="Devices" className="gap-4">
          <h2 className={H2}>Devices</h2>
          <div
            role="img"
            aria-label={view.devices
              .map((device) => `${device.label} ${device.percent}`)
              .join(", ")}
            className="flex h-3.5 gap-0.5"
          >
            {view.devices.map((device, index) => (
              <span
                key={device.key}
                className={`cm-hbar block h-full ${DEVICE_COLORS[index]}`}
                style={{ width: `${device.share * 100}%` }}
              />
            ))}
          </div>
          <div className="flex flex-col">
            {view.devices.map((device, index) => (
              <div
                key={device.key}
                className="flex items-center gap-3 border-b border-divider py-2.5 text-[15px]"
              >
                <span className={`size-3 flex-none ${DEVICE_COLORS[index]}`} />
                <span className="flex-1">{device.label}</span>
                <span className="tabular-nums">
                  <span className="font-medium">{device.percent}</span>
                  <span className="text-neutral-700"> · {device.visitors}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <p
        {...enter(11)}
        className="cm-enter m-0 flex max-w-[720px] items-start gap-2.5 text-sm leading-[1.55] text-neutral-700"
      >
        <span className="flex flex-none pt-px">
          <Shield size={16} />
        </span>
        Private by design. No cookies and no banner. Visitors are never identified; we only see
        their country and city, the page, where they came from and the type of device.
      </p>
    </>
  );
}

const DEVICE_COLORS = ["bg-accent", "bg-accent-300", "bg-neutral-400"];

const ACTION_ICONS = {
  form: <Send size={16} />,
  email: <Mail size={16} />,
  linkedin: <LinkedIn size={16} />,
  site: <Globe size={16} />,
  phone: <Phone size={16} />,
  other: <LinkIcon size={16} />,
} as const;

function BigCard({ index, children, role }: { index: number; children: ReactNode; role?: string }) {
  return (
    <div {...enter(index)} role={role} className="cm-enter">
      <Blueprint className="flex flex-col items-start gap-3.5 px-5 py-7 sm:p-10">
        {children}
      </Blueprint>
    </div>
  );
}

async function Report({
  site,
  userId,
  range,
}: {
  site: OwnedSite;
  userId: string;
  range: AnalyticsRange;
}) {
  const firstPublish = site.versions.at(-1)?.publishedAt ?? null;
  if (!firstPublish) {
    return (
      <>
        <Heading />
        <BigCard index={1}>
          <span className="flex text-accent-700">
            <Chart size={32} />
          </span>
          <h2 className={H2}>Analytics start when your site is live</h2>
          <p className="m-0 max-w-[560px] text-pretty text-neutral-800">
            Once you publish, you&apos;ll see how many people visit, where they are and how they
            found you.
          </p>
          <Link
            href={`/dashboard/sites/${site.id}/edit`}
            className="btn btn-primary min-h-11 gap-2.5 px-[18px] sm:min-h-10"
          >
            Continue editing <ArrowRight />
          </Link>
        </BigCard>
      </>
    );
  }

  let view: ReportView;
  try {
    const report = await getAnalyticsReport(getDb(), { userId, siteId: site.id, days: range });
    if (!report) redirect("/dashboard");
    view = reportView(report, firstPublish);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    console.error("Analytics failed to load", error);
    return (
      <>
        <Heading />
        <BigCard index={1} role="alert">
          <span className="flex text-danger">
            <Alert size={32} />
          </span>
          <h2 className={H2}>We couldn&apos;t load your analytics</h2>
          <p className="m-0 max-w-[560px] text-pretty text-neutral-800">
            Your site isn&apos;t affected, and visits are still being counted. Try again in a
            moment.
          </p>
          <RetryButton />
        </BigCard>
      </>
    );
  }

  const domain = await getSiteDomain(getDb(), { userId, siteId: site.id });
  const liveUrl =
    domain?.stage === "connected" ? `https://${domain.domain}` : siteUrl(site.subdomain);

  if (view.mode === "none") {
    return (
      <>
        <Heading />
        <div {...enter(1)} className="cm-enter">
          <Blueprint className="flex flex-col">
            <div className="flex flex-col items-start gap-3.5 px-5 py-7 sm:p-10">
              <span className="kicker">No visits yet</span>
              <h2 className={H2}>Your site is live. Now let people find it.</h2>
              <p className="m-0 max-w-[600px] text-pretty text-neutral-800">
                Most visitors to a personal site arrive from LinkedIn. Add your address to the
                contact info on your profile, or mention it in your next post.
              </p>
              <ShareSite url={liveUrl} />
            </div>
            <div aria-hidden className="px-[18px] pb-[18px] opacity-60 sm:px-6 sm:pb-6">
              <VisitorMap places={[]} label="" />
            </div>
          </Blueprint>
        </div>
      </>
    );
  }

  const few = view.mode === "few";
  return (
    <>
      <Heading>
        {few ? (
          <span className="text-[15px] text-neutral-700">
            Since you published on <When iso={firstPublish.toISOString()} style="day-month" />
          </span>
        ) : (
          <Ranges current={range} />
        )}
      </Heading>
      <p
        {...enter(1)}
        className="cm-enter m-0 max-w-[880px] text-xl leading-[1.4] text-pretty sm:text-[26px]"
      >
        {view.summary}
      </p>
      <Tiles view={view} />
      <Card index={6} label="Visits over time" className="gap-[18px]">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
          <h2 className={H2}>Visits over time</h2>
          <span className="text-[15px] text-neutral-700">
            {few ? "Every visit so far" : view.chart?.subtitle}
          </span>
        </div>
        {view.chart ? <VisitsChart chart={view.chart} /> : null}
        {few ? (
          <div className="flex flex-col border-t border-divider">
            {view.visits.map((visit) => (
              <div
                key={visit.iso}
                className="grid grid-cols-1 gap-x-5 gap-y-0.5 border-b border-divider py-3.5 text-[15px] sm:grid-cols-[180px_minmax(0,1fr)_auto]"
              >
                <span className="font-medium">
                  <When iso={visit.iso} style="message" />
                </span>
                <span>{visit.place}</span>
                <span className="text-neutral-700">{visit.how}</span>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
      <Geography subtitle={view.geoSubtitle} places={view.places} countries={view.countries} />
      <Breakdowns view={view} />
    </>
  );
}

async function Analytics({ searchParams }: { searchParams: Search }) {
  const session = await getSession();
  if (!session) redirect("/sign-in?callbackURL=/dashboard/analytics");
  const [site, search] = await Promise.all([
    getPrimarySiteForOwner(getDb(), session.user.id),
    searchParams,
  ]);
  if (!site) redirect("/dashboard");
  return <Report site={site} userId={session.user.id} range={rangeOf(search.range)} />;
}

function Shimmer({ className }: { className: string }) {
  return <span className={`cm-shimmer block bg-neutral-200 ${className}`} />;
}

function AnalyticsSkeleton() {
  return (
    <>
      <Heading>
        <Shimmer className="h-11 w-full sm:h-10 sm:w-[360px]" />
      </Heading>
      <div aria-busy="true" aria-label="Loading analytics" className="flex flex-col gap-6">
        <Shimmer className="h-6 w-[72%]" />
        <div className="grid grid-cols-2 gap-3 sm:gap-6 min-[1040px]:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Shimmer key={index} className="h-[120px]" />
          ))}
        </div>
        <Shimmer className="h-[170px] sm:h-[240px]" />
        <Shimmer className="h-[380px]" />
      </div>
    </>
  );
}

export default function AnalyticsPage({ searchParams }: { searchParams: Search }) {
  return (
    <Main>
      <Suspense fallback={<AnalyticsSkeleton />}>
        <Analytics searchParams={searchParams} />
      </Suspense>
    </Main>
  );
}
