import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT, LegalPage, type LegalSection } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What CEOMaker collects, why, who processes it and how long it is kept.",
};

const mail = <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>;

const sections: LegalSection[] = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <>
        <p>
          CEOMaker (ceomaker.app) is operated by Riad Hallouch, an individual based in Algeria. For
          the personal data of the people who sign up, we decide what is collected and why: in data
          protection terms, we are the controller. You can reach us at {mail}.
        </p>
        <p>
          The sites our customers publish have visitors too. Messages a visitor sends through a
          site&apos;s contact form are delivered to the site&apos;s owner, who decides what to do
          with them; we store and deliver them on the owner&apos;s behalf.
        </p>
      </>
    ),
  },
  {
    id: "owners",
    title: "What we collect when you use CEOMaker",
    body: (
      <ul>
        <li>
          <strong>Your account:</strong> your name and email address, and your Google profile
          picture if you sign in with Google. We use them to sign you in and to contact you about
          your account.
        </li>
        <li>
          <strong>Sign-in sessions:</strong> the network address and browser of each signed-in
          device, to keep your account secure and let you sign out everywhere.
        </li>
        <li>
          <strong>Your answers and your site:</strong> the answers to the setup questions, your
          site&apos;s text, colours and settings, every version you publish, and the images you
          upload. We need them to build, store and show your site.
        </li>
        <li>
          <strong>Your CV, if you attach one:</strong> it is sent once to our AI provider to write
          your first draft. We don&apos;t store the file.
        </li>
        <li>
          <strong>AI usage:</strong> how many drafts and rewrites you requested, to apply daily
          limits and keep costs in check. Not the content itself.
        </li>
        <li>
          <strong>Payments, once paid plans start:</strong> Lemon Squeezy handles checkout as the
          seller of record. We receive your plan and its status, never your card details.
        </li>
        <li>
          <strong>Unfinished answers</strong> are kept in your own browser for up to a week so you
          can come back to them, and are cleared once you have a site or sign out.
        </li>
      </ul>
    ),
  },
  {
    id: "visitors",
    title: "What we collect from visitors to our customers' sites",
    body: (
      <>
        <p>Customer sites set no cookies. To give owners simple visitor statistics we record:</p>
        <ul>
          <li>the page viewed, and whether the visitor clicked an email, phone or social link;</li>
          <li>where they came from (for example LinkedIn, Google or another site);</li>
          <li>the type of device (phone, tablet or computer);</li>
          <li>an approximate location, no more precise than a city, from the network;</li>
          <li>
            a code made from the network address and browser that changes every day, so visitors can
            be counted once per day. We never store the network address itself.
          </li>
        </ul>
        <p>
          When a visitor uses a contact form, we store what they type (name, email, organisation,
          topic and message) and deliver it to the site&apos;s owner. We also keep a coded form of
          their network address, which can&apos;t be turned back into the address, to stop the same
          sender flooding a site.
        </p>
      </>
    ),
  },
  {
    id: "bases",
    title: "Why we are allowed to use it",
    body: (
      <ul>
        <li>
          <strong>To provide the service you asked for</strong> (your account, your site, your
          messages): this is necessary for our contract with you.
        </li>
        <li>
          <strong>Our legitimate interests:</strong> keeping accounts and sites secure, preventing
          abuse, and giving owners privacy-friendly statistics about their own sites.
        </li>
        <li>
          <strong>Legal obligations:</strong> payment and tax records, kept by our payment provider
          for as long as the law requires.
        </li>
      </ul>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        ceomaker.app uses only the cookies needed to keep you signed in. They are not used for
        advertising or tracking, and customer sites set none at all. That is why there is no cookie
        banner.
      </p>
    ),
  },
  {
    id: "processors",
    title: "Who processes data for us",
    body: (
      <>
        <p>We use a small number of providers, each only for what it does for us:</p>
        <ul>
          <li>
            <strong>Vercel</strong> hosts the app and the sites (servers in Frankfurt, Germany).
          </li>
          <li>
            <strong>Neon</strong> hosts the database (Frankfurt, Germany).
          </li>
          <li>
            <strong>Resend</strong> sends our emails: sign-in links and account notices.
          </li>
          <li>
            <strong>Anthropic</strong> writes AI drafts from your answers and, if attached, your CV.
          </li>
          <li>
            <strong>Google</strong> signs you in, if you choose Continue with Google.
          </li>
          <li>
            <strong>Lemon Squeezy</strong> handles payments, once paid plans start.
          </li>
        </ul>
        <p>
          Some of these providers are based in the United States, so data can be transferred outside
          the European Economic Area. We rely on the safeguards in their data processing terms, such
          as the European Commission&apos;s standard contractual clauses. We don&apos;t sell
          personal data or share it for advertising.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <ul>
        <li>Your account and your site: until you delete them.</li>
        <li>
          Deleting your site removes every version, your images, its messages and its statistics.
          Deleting your account removes everything it owns.
        </li>
        <li>
          If your site was ever published, its address (only the name) stays reserved for 90 days
          after deletion, so nobody else can take over links that still point to it.
        </li>
        <li>Contact-form messages: until the owner deletes them or deletes the site.</li>
        <li>Sign-in links: they work once and expire after 15 minutes.</li>
        <li>Payment records: as long as tax law requires, kept by Lemon Squeezy.</li>
      </ul>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>
          You can see and correct your details, and delete your site or your whole account, at any
          time in Settings. You can also ask us for a copy of your data, ask us to correct or delete
          it, or object to how we use it, by writing to {mail}. We answer within 30 days.
        </p>
        <p>
          If you are in the European Union or the United Kingdom, you can also complain to your
          local data protection authority.
        </p>
        <p>
          Visitors who wrote to a site through its contact form can ask its owner, or us, to delete
          their message.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        Connections are encrypted, sign-in needs no password (single-use email links or Google), and
        uploads and content are checked before they are stored. No system is perfectly secure; if a
        breach affects your data, we will tell you and the authorities as the law requires.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: <p>CEOMaker is for professionals and isn&apos;t meant for anyone under 16.</p>,
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        If we change this policy in a way that matters, we will email account holders before the
        change takes effect. The date at the top always shows the latest version. See also our{" "}
        <Link href="/terms">terms</Link>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="CEOMaker"
      title="Privacy policy"
      intro={
        <p>
          In short: we collect what we need to build and run your site, we don&apos;t sell it or use
          it for advertising, sites made with CEOMaker set no cookies, and you can delete everything
          yourself at any time.
        </p>
      }
      sections={sections}
    />
  );
}
