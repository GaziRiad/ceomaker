import type { Metadata } from "next";
import { Suspense } from "react";
import { Blueprint, Wordmark } from "@/components/ui";
import { getDb, getEditorDevice, getSiteDomain } from "@ceomaker/db";
import { isPro } from "@ceomaker/schema";
import { draftNoticeText } from "@/lib/ai/events";
import { planFor } from "@/lib/plan";
import { siteAddressParts } from "@/lib/routing";
import { initialsFor, loadOwnedSite, toEditableDraft } from "@/lib/site-data";
import { Editor } from "./editor";
import { isDevice } from "./devices";
import { liveFingerprint } from "./editor-model";
import { IdentifyAccount } from "@/components/product-analytics";

export const metadata: Metadata = { title: "Editor", robots: { index: false } };

async function EditSite({
  params,
  searchParams,
}: {
  params: PageProps<"/dashboard/sites/[id]/edit">["params"];
  searchParams: PageProps<"/dashboard/sites/[id]/edit">["searchParams"];
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { user, site, draft } = await loadOwnedSite(id, `/dashboard/sites/${id}/edit`);
  const [plan, device, domain] = await Promise.all([
    planFor(user.id),
    getEditorDevice(getDb(), user.id),
    getSiteDomain(getDb(), { userId: user.id, siteId: site.id }),
  ]);
  const address = siteAddressParts();
  const notice = draftNoticeText(query.notice);
  const live = site.published ? toEditableDraft(site.published) : null;
  return (
    <>
      <IdentifyAccount id={user.id} />
      <Editor
        key={site.id}
        siteId={site.id}
        subdomain={site.subdomain}
        addressPrefix={address.prefix}
        addressSuffix={address.suffix}
        initialDraft={draft}
        publishedFingerprint={site.published ? liveFingerprint(site.published) : null}
        liveTemplate={live ? { key: live.templateKey, version: live.templateVersion } : null}
        status={site.status}
        versionCount={site.versionCount}
        initials={initialsFor(draft.content.meta.name || user.name, user.email)}
        notice={notice}
        pro={isPro(plan)}
        initialDevice={isDevice(device) ? device : "desktop"}
        customDomain={isPro(plan) && domain?.stage === "connected" ? domain.domain : null}
      />
    </>
  );
}

/** Painted from the static shell while the site loads: the editor's frame, in grey. */
function EditorSkeleton() {
  const block = "bg-neutral-200 motion-safe:animate-pulse";
  return (
    <div
      className="grid min-h-dvh grid-rows-[auto_minmax(0,1fr)] lg:h-dvh"
      aria-busy="true"
      aria-label="Loading the editor"
    >
      <header
        className="flex h-[60px] items-center gap-4 border-b border-divider bg-neutral-100"
        style={{ paddingInline: "clamp(16px,2vw,24px)" }}
      >
        <Wordmark />
        <span className={`${block} ml-auto h-10 w-[140px]`} />
      </header>
      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-3 border-divider bg-neutral-100 p-4 lg:border-r">
          <span className={`${block} h-10`} />
          {[0, 1, 2, 3, 4, 5, 6].map((index) => (
            <span key={index} className={`${block} h-9`} />
          ))}
        </aside>
        <div className="min-h-0 bg-surface p-4 sm:p-7">
          <Blueprint className="mx-auto max-w-[1280px] bg-neutral-100 shadow-md">
            <span className={`${block} block aspect-[16/10]`} />
          </Blueprint>
        </div>
      </div>
    </div>
  );
}

export default function EditPage(props: PageProps<"/dashboard/sites/[id]/edit">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <EditSite params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
