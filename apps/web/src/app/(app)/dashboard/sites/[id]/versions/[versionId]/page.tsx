import { getDb, getPublishedVersion } from "@ceomaker/db";
import { getTemplate, SiteRenderer } from "@ceomaker/templates";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isUuid, loadOwnedSite } from "@/lib/site-data";
import { LocalTime } from "../../../../versions-table";
import { VersionActions } from "./version-actions";

export const metadata: Metadata = { title: "Version", robots: { index: false } };

const bar = "sticky top-0 z-50 border-b border-divider bg-neutral-100";
const barPadding = { paddingInline: "clamp(16px,2vw,24px)" };

/** A published version shown at full size, with the ways back to it. Owners only. */
async function VersionView({
  params,
}: {
  params: PageProps<"/dashboard/sites/[id]/versions/[versionId]">["params"];
}) {
  const { id, versionId } = await params;
  const { user, site } = await loadOwnedSite(id, `/dashboard/sites/${id}/versions/${versionId}`);
  if (!isUuid(versionId)) notFound();
  const version = await getPublishedVersion(getDb(), {
    userId: user.id,
    siteId: site.id,
    versionId,
  });
  const summary = site.versions.find((candidate) => candidate.id === versionId);
  if (!version || !summary) notFound();

  return (
    <>
      <header className={bar} style={barPadding}>
        <div className="flex min-h-[60px] flex-wrap items-center gap-x-5 gap-y-2 py-2.5">
          <Link href="/dashboard" className="btn btn-ghost">
            ← Dashboard
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center gap-2.5 font-heading text-[22px] leading-none font-semibold uppercase">
              Version {summary.number}
              {summary.isCurrent ? (
                <span className="tag tag-accent">Live</span>
              ) : (
                <span className="tag tag-neutral">Earlier version</span>
              )}
            </span>
            <span className="text-[13px] text-neutral-700">
              Published <LocalTime iso={version.publishedAt.toISOString()} /> ·{" "}
              {getTemplate(version.templateKey, version.templateVersion).name} template
            </span>
          </div>
          <VersionActions
            siteId={site.id}
            versionId={version.id}
            number={summary.number}
            isLive={summary.isCurrent}
          />
        </div>
      </header>
      <SiteRenderer
        templateKey={version.templateKey}
        templateVersion={version.templateVersion}
        theme={version.theme}
        content={version.content}
        publishedAt={version.publishedAt}
      />
    </>
  );
}

function VersionSkeleton() {
  return (
    <header className={bar} style={barPadding} aria-busy="true" aria-label="Loading version">
      <div className="flex min-h-[60px] items-center gap-5">
        <Link href="/dashboard" className="btn btn-ghost">
          ← Dashboard
        </Link>
        <span className="h-5 w-48 bg-neutral-200 motion-safe:animate-pulse" />
      </div>
    </header>
  );
}

export default function VersionPage(
  props: PageProps<"/dashboard/sites/[id]/versions/[versionId]">,
) {
  return (
    <Suspense fallback={<VersionSkeleton />}>
      <VersionView params={props.params} />
    </Suspense>
  );
}
