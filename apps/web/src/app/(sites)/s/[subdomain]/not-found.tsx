import { appUrl } from "@/lib/routing";

export default function TenantNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fbfaf7] px-6 text-[#16181d]">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium tracking-[0.18em] text-[#8a6d3b] uppercase">
          Not available
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold">This site isn&apos;t live</h1>
        <p className="mt-4 leading-relaxed text-[#5f636a]">
          The address may be unclaimed, or its owner has not published it yet.
        </p>
        <a
          href={appUrl()}
          className="mt-8 inline-flex min-h-11 items-center rounded bg-[#1f3a5f] px-6 text-sm font-semibold text-white"
        >
          Create your own site
        </a>
      </div>
    </main>
  );
}
