import { getDb, getPrimarySiteForOwner } from "@ceomaker/db";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Mail } from "@/components/ui";
import { getAuth, getSession } from "@/lib/auth";
import { canSendEmail } from "@/lib/email";
import { googleSignInEnabled } from "@/lib/env";
import { siteAddressParts } from "@/lib/routing";
import { CardText, SettingsCard, SettingsSkeleton } from "../_components/card";
import { DeleteAccount } from "../_components/delete-account";
import { EmailChanged } from "../_components/email-changed";
import { Profile } from "../_components/profile";
import { SignOutEverywhere } from "../_components/sign-out-everywhere";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };

function Method({
  mark,
  title,
  detail,
  tag,
}: {
  mark: React.ReactNode;
  title: string;
  detail: string;
  tag: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 border-b border-divider py-3.5">
      <span className="flex size-9 flex-none items-center justify-center border border-divider font-heading text-lg font-semibold text-neutral-800">
        {mark}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{title}</span>
        <span className="text-sm [overflow-wrap:anywhere] text-neutral-700">{detail}</span>
      </div>
      {tag}
    </div>
  );
}

async function AccountSettings() {
  const session = await getSession();
  if (!session) redirect("/sign-in?callbackURL=/dashboard/settings/account");
  const { user } = session;
  const [site, accounts] = await Promise.all([
    getPrimarySiteForOwner(getDb(), user.id),
    getAuth().api.listUserAccounts({ headers: await headers() }),
  ]);
  const google = accounts.some((account) => account.providerId === "google");
  const parts = siteAddressParts();

  return (
    <>
      <EmailChanged />
      <SettingsCard index={1} title="Profile" className="gap-[18px]">
        <Profile
          name={user.name || site?.answers?.name || ""}
          email={user.email}
          canChangeEmail={canSendEmail()}
        />
      </SettingsCard>

      <SettingsCard index={2} title="Sign-in methods">
        <div className="flex flex-col border-t border-divider">
          {google || googleSignInEnabled() ? (
            <Method
              mark="G"
              title="Google"
              detail={google ? user.email : "Not used to sign in yet"}
              tag={
                <span className={`tag ${google ? "tag-accent" : "tag-neutral"}`}>
                  {google ? "Connected" : "Not connected"}
                </span>
              }
            />
          ) : null}
          <Method
            mark={<Mail />}
            title="Email link"
            detail="We email you a link to sign in. There are no passwords."
            tag={<span className="tag tag-neutral">Always on</span>}
          />
        </div>
      </SettingsCard>

      <SettingsCard index={3} title="Sessions" className="gap-3">
        <CardText className="max-w-[600px]">
          Signs you out on every phone, tablet and computer, including this one.
        </CardText>
        <SignOutEverywhere />
      </SettingsCard>

      <SettingsCard index={4} title="Delete account" danger className="gap-3">
        <CardText>
          {site
            ? `Deletes your account and your site, ${parts.prefix}${site.subdomain}${parts.suffix}, with its versions, photos and messages.`
            : "Deletes your account and everything in it."}
        </CardText>
        <DeleteAccount
          email={user.email}
          address={site ? `${parts.prefix}${site.subdomain}${parts.suffix}` : null}
        />
      </SettingsCard>
    </>
  );
}

export default function AccountSettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton heights={[260, 170, 130, 150]} />}>
      <AccountSettings />
    </Suspense>
  );
}
