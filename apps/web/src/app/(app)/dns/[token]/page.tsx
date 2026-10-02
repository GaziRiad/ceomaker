import { getDb, getDomainByShareToken } from "@ceomaker/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Blueprint, Wordmark } from "@/components/ui";
import { recordsFor } from "@/lib/domains/dns";
import { registrableDomain } from "@/lib/domains/input";
import { DNS_PROVIDERS, isDnsProvider, type DnsProviderKey } from "@/lib/domains/providers";
import { ShareRecords } from "./share-records";

// The page an owner sends to an assistant or IT person: the records for their domain and the
// steps at their registrar. The link is unguessable and gives no access to the account.

export const metadata: Metadata = {
  title: "DNS records",
  robots: { index: false, follow: false },
};

type Params = PageProps<"/dns/[token]">["params"];
type Search = PageProps<"/dns/[token]">["searchParams"];

async function Records({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [{ token }, search] = await Promise.all([params, searchParams]);
  const found =
    typeof token === "string" && token.length <= 40
      ? await getDomainByShareToken(getDb(), token)
      : null;
  if (!found) notFound();
  const provider: DnsProviderKey = isDnsProvider(search.p) ? search.p : "other";
  const zone = registrableDomain(found.domain);
  const records = recordsFor(found.domain, found.kind, {
    a: found.aValue,
    cname: found.cnameValue,
  });
  const rows = records.map((record) => ({
    ...record,
    hint:
      found.kind === "subdomain"
        ? found.domain
        : record.name === "@"
          ? `Main domain · ${found.domain}`
          : `www.${found.domain}`,
  }));

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <span className="kicker">DNS records</span>
        <h1 className="m-0 font-heading text-[40px] leading-none font-semibold [overflow-wrap:anywhere] uppercase sm:text-[56px]">
          Connect {found.domain}
        </h1>
      </div>
      {found.stage === "connected" ? (
        <Blueprint className="flex flex-col gap-2 p-[18px] sm:px-6 sm:py-5">
          <span className="text-[19px] font-medium">This domain is already connected.</span>
          <span className="text-neutral-800">Nothing more to do: {found.domain} is live.</span>
        </Blueprint>
      ) : (
        <>
          <p className="m-0 max-w-[680px] text-pretty text-neutral-800">
            Someone asked you to connect {found.domain} to their CEOMaker website. Sign in where{" "}
            {zone} is registered, add {records.length === 1 ? "this record" : "these records"} in
            its DNS settings (sometimes called Manage DNS) and copy each value exactly. Their site
            checks automatically and goes live on its own. This page doesn&apos;t give access to
            their account.
          </p>
          <ShareRecords rows={rows} />
          <section aria-label="Steps" className="flex flex-col gap-4">
            <span className="text-[15px] font-medium">Where is the domain registered?</span>
            <nav aria-label="Domain provider" className="flex flex-wrap gap-2">
              {(Object.keys(DNS_PROVIDERS) as DnsProviderKey[]).map((key) => (
                <Link
                  key={key}
                  href={`?p=${key}`}
                  replace
                  scroll={false}
                  aria-current={key === provider ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded-[4px] border px-3.5 text-sm text-text no-underline hover:border-accent hover:text-text sm:min-h-[38px] ${
                    key === provider ? "border-accent bg-accent-100" : "border-divider bg-bg"
                  }`}
                >
                  {DNS_PROVIDERS[key].name}
                </Link>
              ))}
            </nav>
            <ol className="m-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-4">
              {DNS_PROVIDERS[provider].steps.map((text, index) => (
                <li key={text} className="flex min-w-0 gap-2.5">
                  <span className="flex size-[26px] flex-none items-center justify-center border border-accent text-[13px] font-medium text-accent-700">
                    {index + 1}
                  </span>
                  <span className="text-[15px] leading-normal text-pretty">{text}</span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}

export default function DnsRecordsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  return (
    <>
      <header className="border-b border-divider bg-neutral-100">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center px-5 sm:h-16 sm:px-10">
          <Link href="/" className="text-text no-underline hover:text-text">
            <Wordmark />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-5 pt-6 pb-16 text-base sm:px-10 sm:pt-10 sm:pb-24 sm:text-[17px]">
        <Suspense fallback={<span className="cm-shimmer block h-[320px] bg-neutral-200" />}>
          <Records params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}
