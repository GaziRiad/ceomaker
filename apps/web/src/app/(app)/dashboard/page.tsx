import { getDb, listSitesForUser } from "@ceomaker/db";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { tenantUrl } from "@/lib/routing";
import { Container, Wordmark } from "../components";
import { ClaimSiteForm } from "./claim-form";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

const STATUS_LABELS = {
  draft: { label: "Draft", className: "bg-ink/5 text-stone" },
  published: { label: "Live", className: "bg-emerald-50 text-emerald-800" },
  paused: { label: "Paused", className: "bg-amber-50 text-amber-800" },
} as const;

async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const env = serverEnv();
  const sites = await listSitesForUser(getDb(), session.user.id);

  return (
    <>
      <header className="border-b border-line/70 bg-white">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Wordmark />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-stone sm:inline">{session.user.email}</span>
            <SignOutButton />
          </div>
        </Container>
      </header>
      <main className="py-12 sm:py-16">
        <Container className="max-w-3xl">
          <h1 className="font-display text-3xl font-semibold">
            {sites.length === 0 ? "Claim your address" : "Your site"}
          </h1>

          {sites.length === 0 ? (
            <div className="mt-8 rounded-xl border border-line bg-white p-6 sm:p-8">
              <p className="mb-6 leading-relaxed text-stone">
                Choose the address your site will live at. You can build and preview for free.
              </p>
              <ClaimSiteForm rootDomain={env.ROOT_DOMAIN} />
            </div>
          ) : (
            <ul className="mt-8 space-y-4">
              {sites.map((site) => {
                const url = tenantUrl(site.subdomain, env.APP_URL, env.ROOT_DOMAIN);
                const status = STATUS_LABELS[site.status];
                return (
                  <li
                    key={site.id}
                    className="flex flex-col gap-5 rounded-xl border border-line bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {site.subdomain}.{env.ROOT_DOMAIN}
                      </p>
                      <span
                        className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {site.status === "published" ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm font-semibold hover:border-ink/30"
                        >
                          View site
                        </a>
                      ) : null}
                      <span className="inline-flex min-h-11 items-center rounded-md bg-ink/5 px-4 text-sm text-stone">
                        Editor arrives in the next release
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Container>
      </main>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <Dashboard />
    </Suspense>
  );
}
