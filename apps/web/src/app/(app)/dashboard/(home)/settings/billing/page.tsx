import { getDb, listSubscriptions } from "@ceomaker/db";
import { isPro } from "@ceomaker/schema";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Blueprint, Check } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { FREEMIUS, freemius, freemiusBilling, type FreemiusBilling } from "@/lib/freemius";
import { planFor } from "@/lib/plan";
import { FREE_FEATURES, PRO_FEATURES, PRO_PRICES } from "@/lib/plan-copy";
import { enter } from "../../_components/enter";
import { CancelPro } from "../_components/cancel-pro";

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
const CARD = "/api/billing/freemius/card";
const INVOICE = "/api/billing/freemius/invoice";

type Search = Promise<Record<string, string | string[] | undefined>>;

const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function Note({ children }: { children: ReactNode }) {
  return <p className="m-0 max-w-[620px] text-[15px] text-pretty">{children}</p>;
}

/** Cycle, price, and when it renews or ends, as Freemius has it now. */
function Subscription({ billing, pastDue }: { billing: FreemiusBilling; pastDue: boolean }) {
  const price =
    billing.cycle && billing.amount !== null
      ? `${billing.cycle === "yearly" ? "Yearly" : "Monthly"}, ${money(billing.amount, billing.currency)}.`
      : null;
  const paidUntil = billing.paidUntil ? longDate.format(billing.paidUntil) : null;
  return (
    <>
      <Note>
        {price}{" "}
        {billing.cancelled
          ? `Cancelled: Pro stays on until ${paidUntil ?? "the end of the period you've paid for"}, then your site moves to the free plan.`
          : billing.renewsOn
            ? `Renews on ${longDate.format(billing.renewsOn)}.`
            : null}
      </Note>
      {pastDue && !billing.cancelled ? (
        <Note>
          Your last payment didn&apos;t go through. Freemius is trying again; update your card to
          keep Pro.
        </Note>
      ) : null}
      {billing.cancelled ? null : (
        <span className="flex flex-wrap gap-2">
          <a className="btn btn-secondary min-h-11 px-4 sm:min-h-10" href={CARD}>
            Update card
          </a>
          <CancelPro paidUntil={paidUntil} />
        </span>
      )}
    </>
  );
}

// Upgrading and managing Pro go through Freemius once it's configured (see README, "Payments");
// until then the button says it's coming, and Pro is granted by hand.
async function Billing({ searchParams }: { searchParams: Search }) {
  const session = await getSession();
  if (!session) redirect("/sign-in?callbackURL=/dashboard/settings/billing");
  const [plan, subscriptions, billing, search] = await Promise.all([
    planFor(session.user.id),
    listSubscriptions(getDb(), session.user.id),
    freemiusBilling(session.user.id),
    searchParams,
  ]);
  const pro = isPro(plan);
  const pastDue = subscriptions.some((row) => row.status === "past_due");
  // Pro bought through Freemius and not ended (Pro granted by hand has no subscription).
  const subscribed = subscriptions.some(
    (row) => row.provider === FREEMIUS && row.status !== "canceled",
  );
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
          {search.card === "updated" ? <Note>Your card is updated.</Note> : null}
          {search.card === "unavailable" ? (
            <Note>Your card couldn&apos;t be changed just now. Try again in a minute.</Note>
          ) : null}
          {!pro && search.checkout === "done" ? (
            <Note>
              Thank you. We&apos;re confirming your payment with Freemius: refresh this page in a
              minute to see Pro.
            </Note>
          ) : null}
          {pro && subscribed && billing ? (
            <Subscription billing={billing} pastDue={pastDue} />
          ) : null}
          {pro && subscribed && !billing ? (
            <Note>Your subscription details couldn&apos;t be loaded just now. Try again soon.</Note>
          ) : null}
        </Blueprint>
      </section>
      {billing?.payments.length ? (
        <section {...enter(2)} className="cm-enter">
          <Blueprint className="flex flex-col gap-3 p-[18px] sm:px-6 sm:py-5">
            <h2 className="kicker m-0 font-normal">Invoices</h2>
            <ul className="m-0 flex max-w-[620px] list-none flex-col p-0 text-[15px]">
              {billing.payments.map((payment, index) => (
                <li
                  key={payment.id}
                  className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 py-2.5 ${index ? "border-t border-divider" : ""}`}
                >
                  <span>{longDate.format(payment.date)}</span>
                  <span className="tabular-nums">
                    {money(payment.amount, payment.currency)}
                    {payment.amount < 0 ? " refund" : ""}
                  </span>
                  <a href={`${INVOICE}/${payment.id}`}>Download</a>
                </li>
              ))}
            </ul>
          </Blueprint>
        </section>
      ) : null}
      <section {...enter(3)} className="cm-enter grid grid-cols-1 gap-6 md:grid-cols-2">
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
