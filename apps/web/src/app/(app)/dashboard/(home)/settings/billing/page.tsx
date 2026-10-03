import { getDb, listSubscriptions } from "@ceomaker/db";
import { isPro } from "@ceomaker/schema";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Blueprint, Check } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { freemius } from "@/lib/freemius";
import { planFor } from "@/lib/plan";
import { FREE_FEATURES, PRO_FEATURES, PRO_PRICES } from "@/lib/plan-copy";
import { enter } from "../../_components/enter";

export const metadata: Metadata = { title: "Billing", robots: { index: false } };

function Features({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span className="mt-1 flex">
            <Check size={14} color="var(--color-accent)" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

const CHECKOUT = "/api/billing/freemius/checkout";
const PORTAL = "/api/billing/freemius/portal";

type Search = Promise<Record<string, string | string[] | undefined>>;

// Upgrading goes through Freemius once it's configured (see README, "Plans"); until then the
// button says it's coming, and Pro is granted by hand.
async function Billing({ searchParams }: { searchParams: Search }) {
  const session = await getSession();
  if (!session) redirect("/sign-in?callbackURL=/dashboard/settings/billing");
  const [plan, subscriptions, search] = await Promise.all([
    planFor(session.user.id),
    listSubscriptions(getDb(), session.user.id),
    searchParams,
  ]);
  const pro = isPro(plan);
  const subscription = subscriptions.find((row) => row.status !== "canceled") ?? null;
  const canBuy = freemius() !== null;
  return (
    <>
      <section {...enter(1)} className="cm-enter">
        <Blueprint className="flex flex-col gap-3 p-[18px] sm:px-6 sm:py-5">
          <h2 className="kicker m-0 font-normal">Your plan</h2>
          <span className="font-heading text-4xl leading-none font-semibold uppercase sm:text-[44px]">
            {pro ? "Pro" : "Free"}
          </span>
          <p className="m-0 max-w-[620px] text-[17px] text-pretty">
            {pro
              ? "Every template, your own domain, the contact form and analytics."
              : "Your site can be live for free, on Meridian at yourname.ceomaker.app."}
          </p>
          {!pro && search.checkout === "done" ? (
            <p className="m-0 max-w-[620px] text-[15px] text-pretty">
              Thank you. We&apos;re confirming your payment with Freemius: refresh this page in a
              minute to see Pro.
            </p>
          ) : null}
          {pro && subscription?.status === "past_due" ? (
            <p className="m-0 max-w-[620px] text-[15px] text-pretty">
              Your last payment didn&apos;t go through. Freemius is trying again; update your card
              to keep Pro.
            </p>
          ) : null}
          {pro && subscription ? (
            <a className="btn btn-secondary self-start" href={PORTAL}>
              Manage subscription
            </a>
          ) : null}
          {search.portal === "unavailable" ? (
            <p className="m-0 max-w-[620px] text-[15px] text-pretty">
              Your billing details couldn&apos;t be opened just now. Try again in a minute.
            </p>
          ) : null}
        </Blueprint>
      </section>
      <section {...enter(2)} className="cm-enter grid grid-cols-1 gap-6 md:grid-cols-2">
        <Blueprint className="flex flex-col gap-4 p-[18px] sm:px-6 sm:py-5">
          <span className="font-heading text-[28px] leading-none font-semibold uppercase">
            Free
          </span>
          <Features items={FREE_FEATURES} />
        </Blueprint>
        <Blueprint className="flex flex-col gap-4 border-accent p-[18px] sm:px-6 sm:py-5">
          <span className="flex items-center justify-between gap-3">
            <span className="font-heading text-[28px] leading-none font-semibold uppercase">
              Pro
            </span>
            <span className="text-[15px] text-neutral-800">
              {PRO_PRICES.monthly.price} {PRO_PRICES.monthly.per} or {PRO_PRICES.annual.price}{" "}
              {PRO_PRICES.annual.per}
            </span>
          </span>
          <Features items={PRO_FEATURES} />
          {pro ? null : canBuy ? (
            <>
              <span className="flex flex-wrap gap-3">
                <a className="btn btn-primary" href={`${CHECKOUT}?cycle=annual`}>
                  Upgrade yearly, {PRO_PRICES.annual.price}
                </a>
                <a className="btn btn-secondary" href={`${CHECKOUT}?cycle=monthly`}>
                  Monthly, {PRO_PRICES.monthly.price}
                </a>
              </span>
              <span className="text-[13px] text-neutral-700">
                Secure checkout by Freemius. Cancel any time, and get a full refund within 14 days.
              </span>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-primary self-start" disabled>
                Upgrade to Pro
              </button>
              <span className="text-[13px] text-neutral-700">
                Online payment is coming soon. We&apos;ll email you when you can upgrade.
              </span>
            </>
          )}
        </Blueprint>
      </section>
    </>
  );
}

export default function BillingSettingsPage({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense fallback={<span className="cm-shimmer block h-[320px] bg-neutral-200" />}>
      <Billing searchParams={searchParams} />
    </Suspense>
  );
}
