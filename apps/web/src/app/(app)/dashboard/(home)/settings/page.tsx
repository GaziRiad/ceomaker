import { ADDRESS_HOLD_DAYS, getDb, getPrimarySiteForOwner, getSiteDomain } from "@ceomaker/db";
import { isPro } from "@ceomaker/schema";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ExternalLink, Lock } from "@/components/icons";
import { ArrowRight } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { domainProvider } from "@/lib/domains/provider";
import { toDomainView } from "@/lib/domains/service";
import { emailConfigured } from "@/lib/email";
import { planFor } from "@/lib/plan";
import { appUrl, siteAddressParts, siteUrl } from "@/lib/routing";
import { displayName } from "@/lib/site-data";
import { When } from "../_components/relative-time";
import { AddressForm } from "./_components/address-form";
import { CardText, SettingsCard, SettingsSection, SettingsSkeleton } from "./_components/card";
import { DeleteSite } from "./_components/delete-site";
import { DomainCard } from "./_components/domain-card";
import { NotifySwitch } from "./_components/notify-switch";

/** "Amelia Hart" → "ameliahart.com", for examples in the owner's own name. */
function exampleDomain(name: string): string {
  const plain = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return `${(plain.match(/[a-z0-9]+/g) ?? ["yourname"]).join("")}.com`;
}

export const metadata: Metadata = { title: "Site settings", robots: { index: false } };

async function SiteSettings() {
  const session = await getSession();
  if (!session) redirect("/sign-in?callbackURL=/dashboard/settings");
  const db = getDb();
  const site = await getPrimarySiteForOwner(db, session.user.id);

  if (!site) {
    return (
      <SettingsCard index={1} title="No site yet">
        <CardText>
          Answer a few questions and CEOMaker drafts your site in your voice. Its settings appear
          here once it exists.
        </CardText>
        <Link
          href="/start"
          className="btn btn-primary min-h-11 gap-2.5 self-start px-4 sm:min-h-10"
        >
          Start building <ArrowRight />
        </Link>
      </SettingsCard>
    );
  }

  const parts = siteAddressParts();
  const address = `${parts.prefix}${site.subdomain}${parts.suffix}`;
  // Oldest last: the first publish is when the address locked.
  const firstPublish = site.versions.at(-1)?.publishedAt ?? null;
  const name = displayName(session.user, site.answers?.name);
  const [domainRow, plan] = await Promise.all([
    getSiteDomain(db, { userId: session.user.id, siteId: site.id }),
    planFor(session.user.id),
  ]);

  return (
    <>
      <SettingsCard index={1} title="Address">
        {firstPublish ? (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
              <span className="flex items-center gap-2.5 text-[19px] font-medium [overflow-wrap:anywhere]">
                <span className="flex text-neutral-700">
                  <Lock />
                </span>
                {address}
              </span>
              {site.status === "published" ? (
                <a
                  href={siteUrl(site.subdomain)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center gap-1.5 text-[15px] underline underline-offset-[3px]"
                >
                  View site <ExternalLink size={16} />
                </a>
              ) : null}
            </div>
            <CardText className="max-w-[600px]">
              Locked since your first publish on{" "}
              <When iso={firstPublish.toISOString()} style="day" />. Links to it may already be
              shared in emails, profiles and print, so it stays the same.
            </CardText>
          </>
        ) : (
          <AddressForm
            siteId={site.id}
            subdomain={site.subdomain}
            prefix={parts.prefix}
            suffix={parts.suffix}
          />
        )}
      </SettingsCard>

      {!isPro(plan) && !domainRow ? (
        <SettingsCard index={2} title="Custom domain" className="gap-3">
          <span id="custom-domain" className="tag tag-accent self-start">
            Pro
          </span>
          <CardText>
            Use your own address, like {exampleDomain(name)}, instead of {address}. Custom domains
            are part of Pro.
          </CardText>
          <Link
            href="/dashboard/settings/billing"
            className="btn btn-secondary min-h-11 gap-2.5 self-start px-4 sm:min-h-10"
          >
            See plans <ArrowRight />
          </Link>
        </SettingsCard>
      ) : (
        <SettingsSection index={2} id="custom-domain" label="Custom domain" className="gap-[18px]">
          <DomainCard
            siteId={site.id}
            initial={domainRow ? toDomainView(domainRow) : null}
            available={domainProvider() !== null}
            address={address}
            liveUrl={domainRow ? `https://${domainRow.domain}` : siteUrl(site.subdomain)}
            firstName={name.split(/\s+/)[0] ?? name}
            example={exampleDomain(name)}
            origin={appUrl()}
          />
        </SettingsSection>
      )}

      <SettingsCard index={3} title="Notifications" className="gap-4">
        <NotifySwitch
          siteId={site.id}
          email={session.user.email}
          initial={site.notifyMessages}
          ready={emailConfigured()}
        />
      </SettingsCard>

      <SettingsCard index={4} title="Delete site" danger className="gap-3">
        <CardText>
          {firstPublish
            ? `Takes ${address} offline and deletes the draft, published versions and photos.`
            : "Deletes your draft and photos."}{" "}
          Your account stays.
        </CardText>
        <DeleteSite
          siteId={site.id}
          address={address}
          everPublished={firstPublish !== null}
          holdDays={ADDRESS_HOLD_DAYS}
        />
      </SettingsCard>
    </>
  );
}

export default function SiteSettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton heights={[150, 110, 130, 150]} />}>
      <SiteSettings />
    </Suspense>
  );
}
