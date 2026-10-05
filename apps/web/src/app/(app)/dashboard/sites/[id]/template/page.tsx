import { DOCUMENT_SOURCES, isPro, parseSiteContentForRender } from "@ceomaker/schema";
import type { Metadata } from "next";
import { Suspense } from "react";
import { planFor } from "@/lib/plan";
import { siteAddressParts } from "@/lib/routing";
import { initialsFor, loadOwnedSite, toEditableDraft } from "@/lib/site-data";
import { BuilderHeader } from "../../../builder-header";
import { TemplatePicker } from "./picker";
import { IdentifyAccount } from "@/components/product-analytics";

export const metadata: Metadata = { title: "Choose a template", robots: { index: false } };

async function Picker({
  params,
}: {
  params: PageProps<"/dashboard/sites/[id]/template">["params"];
}) {
  const { id } = await params;
  const { user, site, draft } = await loadOwnedSite(id, `/dashboard/sites/${id}/template`);
  const address = siteAddressParts();
  const pro = isPro(await planFor(user.id));
  const wantsDocument = (site.answers?.sources ?? []).some((source) =>
    DOCUMENT_SOURCES.has(source),
  );
  return (
    <>
      <IdentifyAccount id={user.id} />
      <BuilderHeader
        address={`${address.prefix}${site.subdomain}${address.suffix}`}
        status={
          site.status === "published"
            ? { label: "Live", tone: "accent" }
            : { label: "Draft", tone: "neutral" }
        }
        initials={initialsFor(site.answers?.name ?? user.name, user.email)}
      />
      <TemplatePicker
        siteId={site.id}
        initialTemplate={draft.templateKey}
        current={[site.published && toEditableDraft(site.published), draft].map(
          (shown) => shown && { key: shown.templateKey, version: shown.templateVersion },
        )}
        theme={draft.theme}
        content={parseSiteContentForRender(draft.content)}
        wantsDocument={wantsDocument}
        pro={pro}
      />
    </>
  );
}

export default function TemplatePage(props: PageProps<"/dashboard/sites/[id]/template">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <Picker params={props.params} />
    </Suspense>
  );
}
