import { resolvePhotoGrade, resolveSiteColors } from "@ceomaker/schema";
import { latestTemplate, TemplateView, templateList } from "@ceomaker/templates";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PLATFORM_ICON_DATA_URI } from "@/lib/brand";
import {
  SAMPLE_CONTENT,
  SAMPLE_DATE,
  SAMPLE_THEME,
  sampleTemplateKey,
} from "@/lib/template-samples";

// A template's sample site: the newest design with Amelia Hart's content, as a Pro site shows it
// (contact form on, no badge). Nothing around it, so it reads like a real site. Messages sent
// from its form go nowhere: the form says it's a preview.

type Params = PageProps<"/templates/[key]">["params"];

export function generateStaticParams() {
  return templateList.map((template) => ({ key: template.key }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const key = sampleTemplateKey((await params).key);
  return {
    title: key ? `${latestTemplate(key).name} sample site · CEOMaker` : "Not found",
    // A fictional person: the templates page is the one to find, not her.
    robots: { index: false, follow: true },
    icons: { icon: PLATFORM_ICON_DATA_URI },
  };
}

async function SampleSite({ params }: { params: Params }) {
  const key = sampleTemplateKey((await params).key);
  if (!key) notFound();
  const { version } = latestTemplate(key);
  return (
    <TemplateView
      templateKey={key}
      templateVersion={version}
      colors={resolveSiteColors(SAMPLE_THEME, key, version)}
      photoGrade={resolvePhotoGrade(SAMPLE_THEME)}
      content={SAMPLE_CONTENT}
      publishedAt={SAMPLE_DATE}
    />
  );
}

export default function SampleSitePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <SampleSite params={params} />
    </Suspense>
  );
}
