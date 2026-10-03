import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT, LegalPage, type LegalSection } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms for using CEOMaker: your site, your content, plans, refunds and more.",
};

const mail = <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>;

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "These terms",
    body: (
      <p>
        These terms are an agreement between you and CEOMaker (ceomaker.app), operated by Riad
        Hallouch, an individual based in Algeria. By creating an account you accept them. How we
        handle personal data is explained in our <Link href="/privacy">privacy policy</Link>.
      </p>
    ),
  },
  {
    id: "service",
    title: "The service",
    body: (
      <>
        <p>
          CEOMaker helps you create, edit and publish a personal website. It drafts your site from
          your answers (and your CV, if you attach one), lets you edit it, and hosts it at an
          address on ceomaker.app or on a domain you own.
        </p>
        <p>
          A published site never changes its look unless you publish a change yourself. We may add,
          improve or retire features of the editor and the dashboard over time.
        </p>
      </>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <ul>
        <li>You must be at least 16 and give a name and email address that are really yours.</li>
        <li>
          Keep access to your email and Google account secure: they are how you sign in. You are
          responsible for what happens in your account.
        </li>
        <li>Each account has one site.</li>
      </ul>
    ),
  },
  {
    id: "content",
    title: "Your content",
    body: (
      <>
        <p>
          You own what you put on your site. You give us permission to store, process and display
          it, only to run the service for you, for as long as it is on CEOMaker.
        </p>
        <p>
          Drafts written by AI are a starting point. Read your site before publishing: you are
          responsible for everything it says, including that it is accurate and that you have the
          right to use any image or quote on it.
        </p>
        <p>You must not use CEOMaker to publish anything that:</p>
        <ul>
          <li>is illegal, or infringes someone else&apos;s rights;</li>
          <li>
            pretends to be another person or organisation, or misleads visitors about who you are;
          </li>
          <li>is hateful, harassing, sexual or violent;</li>
          <li>contains spam, scams, malware or phishing;</li>
          <li>makes false claims about other people.</li>
        </ul>
      </>
    ),
  },
  {
    id: "addresses",
    title: "Addresses and domains",
    body: (
      <ul>
        <li>
          Your site address (name.ceomaker.app) is yours while your account is active. We may refuse
          or withdraw an address that impersonates someone, misleads, or is reserved.
        </li>
        <li>
          If you delete a site that was published, its address stays reserved for 90 days so nobody
          else can take over links that still point to it.
        </li>
        <li>
          If you connect your own domain, you remain responsible for keeping it registered and its
          records pointed to us.
        </li>
      </ul>
    ),
  },
  {
    id: "plans",
    title: "Plans and payment",
    body: (
      <>
        <p>
          The free plan lets you publish a site on the Meridian template at an address on
          ceomaker.app, with a small &ldquo;Made with CEOMaker&rdquo; badge. It includes one AI
          draft per account and a few AI rewrites a day.
        </p>
        <p>
          Pro adds the premium templates, your own domain, the contact form and its inbox, visitor
          analytics, more AI use and drafting from a CV, and removes the badge. It is billed monthly
          or yearly, at the price shown when you subscribe, and renews automatically until you
          cancel.
        </p>
        <p>
          Our order process is conducted by our online reseller Paddle.com. Paddle is the merchant
          of record for all our orders: it processes your payment, charges any sales tax or VAT that
          applies, sends your receipts and invoices, and handles payment questions and refunds.
          Paddle&apos;s <a href="https://www.paddle.com/legal/buyer-terms">buyer terms</a> apply to
          the payment.
        </p>
      </>
    ),
  },
  {
    id: "cancelling",
    title: "Cancelling",
    body: (
      <p>
        You can cancel Pro at any time in Settings. You won&apos;t be charged again, and Pro stays
        on until the end of the period you have already paid for. After that your site stays live on
        the free plan (see &ldquo;When Pro ends&rdquo; below).
      </p>
    ),
  },
  {
    id: "refunds",
    title: "Refunds",
    body: (
      <>
        <ul>
          <li>
            <strong>Full refund within 14 days</strong> of your first payment, or of a yearly
            renewal. Write to {mail} or ask through your receipt.
          </li>
          <li>
            Outside those 14 days, payments are not refunded, but you can cancel at any time and
            keep Pro until the end of the period you paid for.
          </li>
          <li>When a refund is made, Pro ends and the site moves to the free plan.</li>
        </ul>
        <p>
          This does not reduce any right you have under the consumer law of your country, such as
          the right of consumers in the European Union and the United Kingdom to withdraw within 14
          days.
        </p>
      </>
    ),
  },
  {
    id: "failed",
    title: "Failed payments, and when Pro ends",
    body: (
      <>
        <p>If a payment fails, Paddle will try again and email you; Pro stays on while we retry.</p>
        <p>
          When Pro ends (you cancelled, a refund was made, or payment couldn&apos;t be collected),
          your site is not taken down. It stays live on the free plan: a premium template is shown
          as Meridian, the contact form is switched off, a custom domain forwards to your
          ceomaker.app address, and the badge appears. Your content, versions and messages are kept,
          and upgrading again brings everything back as it was.
        </p>
      </>
    ),
  },
  {
    id: "prices",
    title: "Price changes",
    body: (
      <p>
        We may change our prices. We will email you at least 30 days before a change affects you,
        and it will apply from your next renewal after that notice, never in the middle of a period
        you have paid for. If you don&apos;t accept the new price, you can cancel before it applies.
      </p>
    ),
  },
  {
    id: "suspension",
    title: "Suspension and ending the service",
    body: (
      <>
        <p>
          We may pause or remove a site, or close an account, if it breaks these terms, puts others
          at risk, or if the law requires it. Where we can, we will tell you first and give you a
          chance to fix the problem. If we close a paid account without a breach on your part, we
          refund the unused part of your period.
        </p>
        <p>
          You can stop using CEOMaker at any time by deleting your account in Settings, which
          deletes your site and data as described in the privacy policy.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    body: (
      <>
        <p>
          We work hard to keep your site online and correct, but the service is provided as it is,
          without a promise that it will always be available or free of errors.
        </p>
        <p>
          As far as the law allows, we are not liable for indirect losses such as lost business or
          lost profits, and our total liability to you is limited to what you paid us in the 12
          months before the claim. Nothing in these terms limits liability that the law does not
          allow to be limited.
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "Applicable law",
    body: (
      <p>
        These terms are governed by the laws of Algeria. If you are a consumer, you keep the
        protection of the mandatory laws of the country where you live, and you can bring a claim
        there.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        If we change these terms in a way that matters, we will email you at least 30 days before
        the change takes effect. If you don&apos;t agree, you can cancel and delete your account
        before then. Questions: {mail}.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      kicker="CEOMaker"
      title="Terms of service"
      intro={
        <p>
          In short: you own your site and are responsible for what it says, you can cancel at any
          time, you get a full refund within 14 days of paying, and we give you 30 days&apos; notice
          before any price change.
        </p>
      }
      sections={sections}
    />
  );
}
