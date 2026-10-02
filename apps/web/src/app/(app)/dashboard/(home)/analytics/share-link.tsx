"use client";

import { useRouter } from "next/navigation";
import { CopyButton, useCopy } from "@/components/dns-records";
import { LinkedIn, Rotate } from "@/components/icons";
import { useToast } from "../_components/toasts";

/** The site's address to copy, and a LinkedIn share, for a site nobody has visited yet. */
export function ShareSite({ url }: { url: string }) {
  const { copied, copy } = useCopy();
  const say = useToast();
  return (
    <>
      <div className="flex max-w-full items-stretch border border-divider bg-neutral-100">
        <code className="flex min-w-0 items-center px-3.5 font-mono text-[15px] [overflow-wrap:anywhere]">
          {url.replace(/^https?:\/\//, "")}
        </code>
        <CopyButton
          label="Copy link"
          text="Copy link"
          done={copied === "site"}
          onCopy={() => {
            copy("site", url);
            say("ok", "Link copied");
          }}
          className="min-h-11 rounded-none border-0 border-l border-divider bg-transparent text-accent-700 sm:min-h-10"
        />
      </div>
      <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
        <a
          className="btn btn-primary min-h-11 flex-1 gap-2.5 px-[18px] text-bg no-underline hover:text-bg sm:min-h-10 sm:flex-none"
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <LinkedIn size={16} />
          Share on LinkedIn
        </a>
      </div>
    </>
  );
}

export function RetryButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-secondary min-h-11 gap-2 px-4 sm:min-h-10"
      onClick={() => router.refresh()}
    >
      <Rotate size={16} />
      Try again
    </button>
  );
}
