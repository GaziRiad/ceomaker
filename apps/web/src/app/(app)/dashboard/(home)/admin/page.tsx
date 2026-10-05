import { getAdminOverview, getDb, listAccountsForAdmin, type AdminAccount } from "@ceomaker/db";
import { giftGrantsPro, normalizeTemplateKey } from "@ceomaker/schema";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink } from "@/components/icons";
import { Blueprint } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { siteAddressParts, siteUrl } from "@/lib/routing";
import { displayName } from "@/lib/site-data";
import { enter } from "../_components/enter";
import { When } from "../_components/relative-time";
import { EndGift, GiftPro } from "./_components/gift-controls";

// The admin page: every account, its plan and its site, and gifts of Pro. Only for the emails
// in ADMIN_EMAILS; anyone else sees a page that doesn't exist.

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

type Search = Promise<Record<string, string | string[] | undefined>>;

const PATH = "/dashboard/admin";

const shortDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function templateName(key: string): string {
  const known = normalizeTemplateKey(key) ?? "meridian";
  return known.charAt(0).toUpperCase() + known.slice(1);
}

/** The plan in a few words: who pays for it, or when the gift ends. */
function planLine(account: AdminAccount, now: Date): string {
  const until = account.proUntil ? shortDate.format(account.proUntil) : null;
  const giftOn = account.proUntil !== null && giftGrantsPro(account.proUntil, now);
  const gift = giftOn ? `gift until ${until}` : until ? `gift ended ${until}` : null;
  if (account.paid) {
    const paid = account.paid === "past_due" ? "Pro, payment retrying" : "Pro, paid";
    return giftOn ? `${paid}, ${gift}` : paid;
  }
  if (account.plan === "pro") return gift ? `Pro, ${gift}` : "Pro, set by hand";
  return gift ? `Free, ${gift}` : "Free";
}

function Tile({
  index,
  label,
  value,
  note,
}: {
  index: number;
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div {...enter(index)} className="cm-enter min-w-0">
      <Blueprint className="flex h-full min-w-0 flex-col gap-1.5 p-4 sm:px-[22px] sm:py-5">
        <span className="kicker">{label}</span>
        <span className="mt-auto font-heading text-[34px] leading-none font-semibold uppercase tabular-nums sm:text-[44px]">
          {value}
        </span>
        {/* Always there, so the numbers line up across the row. */}
        <span className="min-h-5 text-sm text-neutral-700">{note}</span>
      </Blueprint>
    </div>
  );
}

const STATUS = {
  published: { label: "Live", className: "bg-accent-100 text-accent-800" },
  paused: { label: "Paused", className: "bg-neutral-200 text-neutral-800" },
  draft: { label: "Draft", className: "bg-neutral-200 text-neutral-800" },
} as const;

function SiteCell({ account }: { account: AdminAccount }) {
  const { site } = account;
  if (!site) return <span className="text-neutral-700">No site yet</span>;
  const status = STATUS[site.status];
  const address = `${siteAddressParts().prefix}${site.subdomain}${siteAddressParts().suffix}`;
  const details = [
    templateName(site.templateKey),
    site.publishedAt ? `live since ${shortDate.format(site.publishedAt)}` : null,
    site.status === "draft"
      ? null
      : `${site.views} ${site.views === 1 ? "view" : "views"} in 30 days`,
  ].filter(Boolean);
  return (
    <>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {site.status === "published" ? (
          <a
            href={siteUrl(site.subdomain)}
            target="_blank"
            rel="noopener"
            className="inline-flex min-w-0 items-center gap-1.5 break-all"
          >
            {address}
            <ExternalLink size={14} />
          </a>
        ) : (
          <span className="min-w-0 break-all">{address}</span>
        )}
        <span className={`px-1.5 py-0.5 text-xs font-semibold uppercase ${status.className}`}>
          {status.label}
        </span>
      </span>
      <span className="text-sm text-neutral-700">{details.join(", ")}</span>
      {site.domain ? <span className="text-sm break-all">Own domain: {site.domain}</span> : null}
      {account.otherSites ? (
        <span className="text-sm text-neutral-700">
          and {account.otherSites} more {account.otherSites === 1 ? "site" : "sites"}
        </span>
      ) : null}
    </>
  );
}

function AccountRow({ account, now }: { account: AdminAccount; now: Date }) {
  const name = displayName(account);
  const giftOn = account.proUntil !== null && giftGrantsPro(account.proUntil, now);
  // What endProGift can end: a gift that hasn't ended, or Pro set by hand (no date, unpaid).
  const canEnd =
    account.plan === "pro" && (giftOn || (account.proUntil === null && account.paid === null));
  return (
    <li className="grid grid-cols-1 gap-3 border-t border-divider py-4 first:border-t-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_196px] md:gap-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-semibold">{name}</span>
        <span className="text-[15px] break-all">{account.email}</span>
        <span className="text-sm text-neutral-700">
          Joined {shortDate.format(account.createdAt)}
          {account.lastSeenAt ? (
            <>
              , seen{" "}
              <span className="inline-block first-letter:lowercase">
                <When iso={account.lastSeenAt.toISOString()} style="relative" />
              </span>
            </>
          ) : null}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={account.plan === "pro" ? "font-semibold text-accent-800" : undefined}>
          {planLine(account, now)}
        </span>
        {account.proNote ? (
          <span className="text-sm break-words text-neutral-700">{account.proNote}</span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <SiteCell account={account} />
      </div>
      <div className="flex flex-wrap items-start gap-2 md:justify-end">
        <GiftPro
          userId={account.id}
          name={name}
          giftEnd={account.proUntil ? account.proUntil.toISOString() : null}
        />
        {canEnd ? <EndGift userId={account.id} name={name} paid={account.paid !== null} /> : null}
      </div>
    </li>
  );
}

async function Admin({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const search = await searchParams;
  const query = typeof search.q === "string" ? search.q.trim().slice(0, 100) : "";
  const db = getDb();
  const now = new Date();
  const [overview, { accounts, more }] = await Promise.all([
    getAdminOverview(db, now),
    listAccountsForAdmin(db, { search: query, now }),
  ]);

  return (
    <>
      <h1
        {...enter(0)}
        className="cm-enter m-0 font-heading text-[40px] leading-none font-semibold uppercase sm:text-[56px]"
      >
        Admin
      </h1>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 min-[1040px]:grid-cols-4">
        <Tile
          index={1}
          label="Accounts"
          value={overview.accounts}
          note={`${overview.newAccounts} in the last 7 days`}
        />
        <Tile index={2} label="Published sites" value={overview.published} />
        <Tile index={3} label="Paying" value={overview.paying} />
        <Tile index={4} label="Gifted Pro" value={overview.gifted} />
      </div>
      <section {...enter(5)} className="cm-enter">
        <Blueprint className="flex flex-col gap-4 p-[18px] sm:px-6 sm:py-5">
          <Form action={PATH} role="search" className="flex max-w-[560px] gap-2">
            <input
              type="search"
              name="q"
              defaultValue={query}
              aria-label="Search accounts"
              placeholder="Name, email or site address"
              className="input min-h-11 min-w-0 flex-1 text-base"
            />
            <button type="submit" className="btn btn-secondary min-h-11 px-4">
              Search
            </button>
          </Form>
          <p className="m-0 text-sm text-neutral-700">
            {query ? (
              <>
                {accounts.length} {accounts.length === 1 ? "account" : "accounts"} matching &ldquo;
                {query}&rdquo;. <Link href={PATH}>Show all</Link>
              </>
            ) : more ? (
              `The newest ${accounts.length} accounts. Search to find others.`
            ) : (
              `${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}, newest first.`
            )}
          </p>
          <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_196px] gap-6 md:grid">
            <span className="kicker">Person</span>
            <span className="kicker">Plan</span>
            <span className="kicker">Site</span>
            <span aria-hidden="true" />
          </div>
          <ul className="m-0 list-none p-0">
            {accounts.map((account) => (
              <AccountRow key={account.id} account={account} now={now} />
            ))}
          </ul>
        </Blueprint>
      </section>
    </>
  );
}

export default function AdminPage({ searchParams }: { searchParams: Search }) {
  // Nothing renders until the access check has passed, not even the heading.
  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 pt-6 pb-16 sm:px-10 sm:pt-10 sm:pb-24">
      <Suspense fallback={<span className="cm-shimmer block h-[480px] bg-neutral-200" />}>
        <Admin searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
