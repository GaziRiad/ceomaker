"use client";

import type { DnsFixRow, DnsRecord, DomainFix } from "@ceomaker/schema";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ConfirmDialog, Modal } from "@/components/confirm-dialog";
import {
  Alert,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  Info,
  Search,
  Send,
  Shield,
  Trash,
} from "@/components/icons";
import { ArrowRight, Check, Mail } from "@/components/ui";
import { CopyButton, RecordsTable, useCopy, type RecordRow } from "@/components/dns-records";
import { DNS_PROVIDERS, type DnsProviderKey } from "@/lib/domains/providers";
import type { DomainResult, DomainView } from "@/lib/domains/service";
import { relativeTime } from "../../_components/relative-time";
import { useToast } from "../../_components/toasts";
import {
  checkDomainAction,
  connectDomainAction,
  domainRecordsAddedAction,
  removeDomainAction,
} from "../actions";

type Shown = "none" | "records" | "waiting" | "fix" | "securing" | "connected";

const TAGS: Partial<Record<Shown, { label: string; className: string }>> = {
  records: { label: "Step 1 of 3", className: "tag-neutral" },
  waiting: { label: "Checking", className: "tag-accent" },
  fix: { label: "Needs a fix", className: "tag-warning" },
  securing: { label: "Almost done", className: "tag-accent" },
};

type StepState = "done" | "cur" | "warn" | "todo";
const STEPS: Partial<Record<Shown, [StepState, StepState, StepState]>> = {
  records: ["cur", "todo", "todo"],
  waiting: ["done", "cur", "todo"],
  fix: ["done", "warn", "todo"],
  securing: ["done", "done", "cur"],
};

const HIT = "min-h-11 sm:min-h-10";
const MONO = "font-mono text-sm [overflow-wrap:anywhere]";

function shownOf(view: DomainView | null): Shown {
  if (!view) return "none";
  if (view.stage === "waiting" && view.diagnosis?.fix) return "fix";
  return view.stage;
}

function hintFor(record: DnsRecord, view: DomainView): string {
  if (view.kind === "subdomain") return view.domain;
  return record.name === "@" ? `Main domain · ${view.domain}` : `www.${view.domain}`;
}

function recordRows(view: DomainView): RecordRow[] {
  return view.records.map((record) => ({ ...record, hint: hintFor(record, view) }));
}

/** The hosts a domain needs, in the order the waiting list shows them. */
function hostsOf(view: DomainView): string[] {
  return view.kind === "apex" ? [`www.${view.domain}`, view.domain] : [view.domain];
}

const ACTION_TAG: Record<DnsFixRow["action"], string> = {
  Delete: "bg-danger-soft text-danger",
  Add: "tag-accent",
  Keep: "tag-neutral",
};

function fixCopy(
  fix: DomainFix,
  domain: string,
): { title: string; text: string; act: string; after: string } {
  switch (fix.kind) {
    case "old": {
      const deletes = fix.rows.filter((row) => row.action === "Delete");
      const type = deletes[0]?.type ?? "A";
      const replacing = fix.rows.some((row) => row.action === "Add");
      return {
        title:
          deletes.length > 1
            ? "Old records still point somewhere else"
            : "An old record still points somewhere else",
        text: `${domain} has ${deletes.length > 1 ? "extra records" : `an extra ${type} record`} pointing to ${fix.oldValue}, probably your previous website. While ${deletes.length > 1 ? "they're" : "it's"} there, some visitors land on the old site instead of yours.`,
        act: replacing
          ? "At your domain provider, replace the old record with the new one:"
          : `At your domain provider, delete the old record${deletes.length > 1 ? "s" : ""} and keep the new one:`,
        after: replacing ? "" : "Leave the www record as it is.",
      };
    }
    case "partial": {
      const wwwBroken = fix.broken.startsWith("www.");
      return {
        title: `${fix.working} works, but ${fix.broken} doesn't yet`,
        text: wwwBroken
          ? "The www address still points somewhere else. People who type the address with www don't reach your site."
          : "The main domain, without www, still points to your old host. People who type the address without www don't reach your site.",
        act: "Add this record at your domain provider:",
        after: wwwBroken
          ? "If there's already a record for www, edit it to this value instead of adding a second one."
          : "If there's already an A record for @, edit it to this value instead of adding a second one.",
      };
    }
    case "verify":
      return {
        title: `${domain} is in use on another platform`,
        text: "It's still connected to a website builder or another service. To prove it's yours, add one extra record. You can delete it once we've confirmed.",
        act: "Add this record at your domain provider:",
        after: "Then remove the domain from the other service if you no longer use it there.",
      };
  }
}

function lastChecked(view: DomainView, checking: boolean, now: Date): string {
  if (checking) return "Checking now…";
  if (!view.checkedAt) return "Not checked yet";
  const when = relativeTime(new Date(view.checkedAt), now);
  return when === "Just now" ? "Last checked just now" : `Last checked ${when}`;
}

/**
 * Settings › Site › Custom domain: connect a domain the owner bought elsewhere, with the records
 * to add, a guide for their registrar, automatic checks and plain-word fixes, until it's live.
 */
export function DomainCard({
  siteId,
  initial,
  available,
  address,
  liveUrl,
  firstName,
  example,
  origin,
}: {
  siteId: string;
  initial: DomainView | null;
  /** False when custom domains can't be set up on this deployment yet. */
  available: boolean;
  /** The site's own address, e.g. hart.ceomaker.co. */
  address: string;
  /** Where "View site" goes once the domain is live. */
  liveUrl: string;
  firstName: string;
  /** A domain in the owner's name for the examples, e.g. ameliahart.com. */
  example: string;
  /** This app's origin, for the link that can be sent to an assistant. */
  origin: string;
}) {
  const ids = useId();
  const router = useRouter();
  const say = useToast();
  const { copied, copy } = useCopy();
  const [view, setView] = useState(initial);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [recsOpen, setRecsOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [provider, setProvider] = useState<DnsProviderKey>("godaddy");
  const [dialog, setDialog] = useState<"share" | "remove" | null>(null);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [pending, startTransition] = useTransition();
  const shown = shownOf(view);

  const apply = (result: DomainResult, previous: DomainView | null) => {
    if (!result.ok) {
      say("error", result.error);
      return false;
    }
    setView(result.view);
    if (result.view?.stage === "connected" && previous?.stage !== "connected") {
      say("ok", `${result.view.domain} is live`);
      router.refresh();
    }
    return true;
  };

  const runCheck = async (quiet: boolean) => {
    if (!quiet) setChecking(true);
    const previous = view;
    const result = await checkDomainAction(siteId).catch(() => null);
    setChecking(false);
    setNow(new Date());
    if (!result) {
      if (!quiet) say("error", "Couldn't reach the server. Try again.");
      return;
    }
    if (result.ok || !quiet) apply(result, previous);
  };

  // While we wait on DNS or the certificate, check by ourselves; keep "last checked" fresh.
  const stage = view?.stage;
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(tick);
  }, []);
  const check = useRef(runCheck);
  useEffect(() => {
    check.current = runCheck;
  });
  useEffect(() => {
    if (stage !== "waiting" && stage !== "securing") return;
    const timer = setInterval(
      () => void check.current(true),
      stage === "securing" ? 10_000 : 30_000,
    );
    return () => clearInterval(timer);
  }, [stage]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await connectDomainAction(siteId, input).catch(() => ({
        ok: false as const,
        error: "Couldn't reach the server. Try again.",
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setView(result.view);
      setInput("");
    });
  };

  const added = () => {
    startTransition(async () => {
      const previous = view;
      const result = await domainRecordsAddedAction(siteId).catch(() => null);
      setNow(new Date());
      if (!result) return say("error", "Couldn't reach the server. Try again.");
      setRecsOpen(false);
      apply(result, previous);
    });
  };

  const remove = (reason: "reset" | "remove") => {
    startTransition(async () => {
      const domain = view?.domain;
      const result = await removeDomainAction(siteId).catch(() => null);
      if (!result?.ok)
        return say("error", result?.error ?? "Couldn't reach the server. Try again.");
      setDialog(null);
      setView(null);
      setInput("");
      setTipOpen(false);
      if (reason === "remove") {
        say("ok", `${domain} removed. Your site is back on ${address}.`);
        router.refresh();
      }
    });
  };

  const steps = STEPS[shown];
  const tag = TAGS[shown];
  const fix = shown === "fix" && view?.diagnosis?.fix ? view.diagnosis.fix : null;
  const fixText = fix && view ? fixCopy(fix, view.domain) : null;
  const pName = DNS_PROVIDERS[provider].name;
  const shareLink = view ? `${origin}/dns/${view.shareToken}?p=${provider}` : "";
  const mailBody = view
    ? `Hi,\n\nCould you connect ${view.domain} to my website? It needs ${view.records.length === 1 ? "this record" : "these records"} in the domain's DNS settings${provider !== "other" ? ` at ${pName}` : ""}:\n\n${view.records
        .map((record) => `${record.type} record · Name: ${record.name} · Value: ${record.value}`)
        .join("\n")}\n\nStep-by-step instructions: ${shareLink}\n\nThank you,\n${firstName}`
    : "";
  const checkLabel = checking ? "Checking…" : shown === "fix" ? "Check again" : "Check now";
  const checkButton = (className: string) => (
    <button
      type="button"
      className={className}
      disabled={checking}
      onClick={() => void runCheck(false)}
    >
      {checking ? <span aria-hidden className="cm-spinner size-3.5 border-2" /> : null}
      {checkLabel}
    </button>
  );
  const sendButton = (label: string, className: string) => (
    <button type="button" className={className} onClick={() => setDialog("share")}>
      <Send size={16} />
      {label}
    </button>
  );

  let body: ReactNode;
  if (!available && !view) {
    body = (
      <>
        <p className="m-0 max-w-[620px] text-pretty text-neutral-800">
          Use your own address, like {example}. Your {address} address keeps working and forwards to
          it.
        </p>
        <div className="flex items-start gap-3 bg-neutral-200 px-4 py-3.5">
          <span className="flex pt-0.5 text-neutral-700">
            <Info />
          </span>
          <div className="flex flex-col gap-1">
            <span className="tag tag-neutral self-start bg-neutral-100">Not available yet</span>
            <span className="text-[15px] text-pretty text-neutral-800">
              Connecting your own domain opens soon. Your site stays at {address} in the meantime.
            </span>
          </div>
        </div>
      </>
    );
  } else if (shown === "none") {
    body = (
      <div className="cm-swap flex flex-col gap-3.5">
        <p className="m-0 max-w-[620px] text-pretty text-neutral-800">
          Use your own address, like {example}. Your {address} address keeps working and forwards to
          it.
        </p>
        <form
          noValidate
          className="flex max-w-[620px] flex-wrap items-end gap-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!pending) submit();
          }}
        >
          <div className="field min-w-0 flex-[1_1_260px]">
            <label htmlFor={`${ids}-in`}>Your domain</label>
            <input
              id={`${ids}-in`}
              className="input min-h-12 text-base"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setError(null);
              }}
              placeholder={example}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="url"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${ids}-err` : undefined}
              disabled={pending}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary min-h-12 flex-[1_1_100%] gap-2.5 px-[18px] sm:flex-none"
            disabled={pending}
          >
            {pending ? "Connecting…" : "Connect domain"}
            <ArrowRight />
          </button>
        </form>
        {error ? (
          <span
            id={`${ids}-err`}
            role="alert"
            className="flex items-start gap-2 text-sm text-danger"
          >
            <span className="flex pt-0.5">
              <Alert size={16} />
            </span>
            {error}
          </span>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            className={`btn btn-ghost ${HIT} gap-1.5 self-start pl-0 text-accent-700`}
            aria-expanded={buyOpen}
            onClick={() => setBuyOpen((open) => !open)}
          >
            Don&apos;t have a domain yet?
            <ChevronDown
              size={16}
              className={`transition-transform duration-[250ms] ${buyOpen ? "rotate-180" : ""}`}
            />
          </button>
          {buyOpen ? (
            <p className="cm-swap m-0 max-w-[620px] bg-neutral-200 px-4 py-3.5 text-[15px] leading-[1.55] text-pretty text-neutral-900">
              You can buy a domain from any domain registrar, usually for $10 to $20 a year. Search
              for the name you want, buy it, then come back here and type it in. Many people use
              their full name, like {example}.
            </p>
          ) : null}
        </div>
      </div>
    );
  } else if (view && shown === "records") {
    body = (
      <div className="flex flex-col gap-[18px]">
        <p className="cm-swap m-0 max-w-[640px] text-pretty">
          Sign in where you bought <strong className="font-medium">{view.zone}</strong> and add{" "}
          {view.records.length === 1
            ? "this record"
            : `these ${view.records.length === 2 ? "two" : view.records.length} records`}{" "}
          in its DNS settings (sometimes called Manage DNS). Copy each value exactly.
        </p>
        <RecordsTable rows={recordRows(view)} copied={copied} copy={copy} />
        <div className="flex flex-col gap-2.5">
          <span className="text-[15px] font-medium">Where did you buy your domain?</span>
          <div
            role="group"
            aria-label="Domain provider"
            className="-mx-[18px] flex flex-nowrap gap-2 overflow-x-auto px-[18px] pt-0.5 pb-1.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
          >
            {(Object.keys(DNS_PROVIDERS) as DnsProviderKey[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={provider === key}
                onClick={() => setProvider(key)}
                className={`min-h-11 flex-none rounded-[4px] border px-3.5 text-sm whitespace-nowrap transition-[border-color,background,transform] duration-200 hover:-translate-y-0.5 hover:border-accent sm:min-h-[38px] ${
                  provider === key ? "border-accent bg-accent-100" : "border-divider bg-bg"
                }`}
              >
                {DNS_PROVIDERS[key].name}
              </button>
            ))}
          </div>
        </div>
        <ol
          key={provider}
          aria-label={`Steps for ${pName}`}
          className="m-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-4"
        >
          {DNS_PROVIDERS[provider].steps.map((text, index) => (
            <li
              key={text}
              className="cm-swap flex min-w-0 gap-2.5"
              style={{ "--delay": `${index * 50}ms` } as CSSProperties}
            >
              <span className="flex size-[26px] flex-none items-center justify-center border border-accent text-[13px] font-medium text-accent-700">
                {index + 1}
              </span>
              <span className="text-[15px] leading-normal text-pretty">{text}</span>
            </li>
          ))}
        </ol>
        <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
          <button
            type="button"
            className={`btn btn-primary ${HIT} flex-[1_1_100%] gap-2.5 px-[18px] sm:flex-none`}
            disabled={pending}
            onClick={added}
          >
            {pending ? "Checking…" : "I've added the records"}
            <ArrowRight />
          </button>
          {sendButton(
            "Send these steps to someone",
            `btn btn-secondary ${HIT} flex-[1_1_100%] gap-2 px-4 sm:flex-none`,
          )}
          <button
            type="button"
            className={`btn btn-ghost ${HIT} text-neutral-800`}
            disabled={pending}
            onClick={() => remove("reset")}
          >
            Use a different domain
          </button>
        </div>
      </div>
    );
  } else if (view && shown === "waiting") {
    body = (
      <div className="cm-swap flex flex-col gap-4">
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden
            className="relative flex size-[22px] flex-none items-center justify-center"
          >
            <span className="cm-ring absolute inset-0 rounded-full border-[1.5px] border-accent" />
            <span className="size-2 rounded-full bg-accent" />
          </span>
          <span className="text-[19px] font-medium [overflow-wrap:anywhere]">
            Waiting for {view.domain}
          </span>
        </div>
        <p className="m-0 max-w-[640px] text-pretty text-neutral-800">
          We check automatically. This usually takes a few minutes, sometimes up to 24 hours.
          We&apos;ll email you when it&apos;s live.
        </p>
        <div className="flex max-w-[640px] flex-col border-t border-divider">
          {(view.diagnosis?.hosts ?? hostsOf(view).map((name) => ({ name, ok: false }))).map(
            (host) => (
              <div
                key={host.name}
                className="flex items-center justify-between gap-3 border-b border-divider py-3"
              >
                <span className={`min-w-0 ${MONO}`}>{host.name}</span>
                <span
                  className={`flex items-center gap-1.5 text-sm whitespace-nowrap ${host.ok ? "text-success" : "text-neutral-700"}`}
                >
                  {host.ok ? <Check size={16} /> : <Clock size={16} />}
                  {host.ok ? "Found" : "Waiting"}
                </span>
              </div>
            ),
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span role="status" className="text-sm text-neutral-700">
            {lastChecked(view, checking, now)}
          </span>
          {checkButton(`btn btn-secondary ${HIT} gap-2 px-4`)}
        </div>
        <button
          type="button"
          className={`btn btn-ghost ${HIT} gap-1.5 self-start pl-0 text-accent-700`}
          aria-expanded={recsOpen}
          onClick={() => setRecsOpen((open) => !open)}
        >
          {recsOpen ? "Hide the records" : "Show the records again"}
          <ChevronDown
            size={16}
            className={`transition-transform duration-[250ms] ${recsOpen ? "rotate-180" : ""}`}
          />
        </button>
        {recsOpen ? <RecordsTable rows={recordRows(view)} copied={copied} copy={copy} /> : null}
      </div>
    );
  } else if (view && fix && fixText) {
    body = (
      <div className="cm-swap flex flex-col gap-4">
        <div className="flex items-start gap-3 bg-warning-soft p-4">
          <span className="flex flex-none pt-0.5 text-warning">
            <Alert />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[17px] font-medium [overflow-wrap:anywhere]">
              {fixText.title}
            </span>
            <span className="text-[15px] leading-[1.55] text-pretty text-neutral-900">
              {fixText.text}
            </span>
          </div>
        </div>
        <span className="text-[15px] font-medium">{fixText.act}</span>
        <div className="flex flex-col border border-divider">
          {fix.rows.map((row, index) => {
            const key = `fix-${index}`;
            const strike = row.action === "Delete";
            return (
              <div
                key={key}
                className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2 px-3.5 py-3 [grid-template-areas:'act_type'_'val_val'] sm:grid-cols-[84px_130px_minmax(0,1fr)] sm:[grid-template-areas:'act_type_val'] ${index ? "border-t border-divider" : ""}`}
              >
                <span className="[grid-area:act]">
                  <span className={`tag ${ACTION_TAG[row.action]}`}>{row.action}</span>
                </span>
                <span className="text-[15px] font-medium [grid-area:type]">
                  {row.type}
                  <span className="font-normal text-neutral-700"> · {row.name}</span>
                </span>
                <span className="flex min-w-0 items-center gap-2 [grid-area:val]">
                  <code
                    className={`min-w-0 flex-1 rounded-[4px] border border-divider bg-neutral-100 px-2.5 py-2 ${MONO} ${strike ? "text-neutral-700 line-through" : "text-text"}`}
                  >
                    {row.value}
                  </code>
                  {row.action === "Add" ? (
                    <CopyButton
                      label={`Copy ${row.type} value ${row.value}`}
                      done={copied === key}
                      onCopy={() => copy(key, row.value)}
                      className={HIT}
                    />
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
        {fixText.after ? (
          <span className="max-w-[640px] text-sm text-pretty text-neutral-700">
            {fixText.after}
          </span>
        ) : null}
        <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
          {checkButton(`btn btn-primary ${HIT} flex-1 gap-2 px-[18px] sm:flex-none`)}
          {sendButton(
            "Send to someone",
            `btn btn-secondary ${HIT} flex-1 gap-2 px-4 whitespace-nowrap sm:flex-none`,
          )}
        </div>
      </div>
    );
  } else if (view && shown === "securing") {
    body = (
      <div className="cm-swap flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <span className="flex text-accent-700">
            <Shield size={22} />
          </span>
          <span className="text-[19px] font-medium">Your domain is connected.</span>
        </div>
        <p className="m-0 max-w-[620px] text-pretty text-neutral-800">
          Setting up the secure padlock, usually under a minute. Your site will then open at
          https://{view.domain}.
        </p>
        <div
          role="progressbar"
          aria-label="Setting up the secure padlock"
          className="relative h-[3px] max-w-[420px] overflow-hidden bg-neutral-200"
        >
          <span className="cm-indet absolute inset-y-0 left-0 w-[30%] bg-accent" />
        </div>
      </div>
    );
  } else if (view && shown === "connected") {
    body = (
      <div className="cm-swap flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <span className="font-heading text-[34px] leading-none font-semibold [overflow-wrap:anywhere] sm:text-[52px]">
            {view.domain}
          </span>
          <span className="tag gap-1.5 bg-success-soft text-success">
            <span aria-hidden className="cm-blink size-[7px] rounded-full bg-success" />
            Live
          </span>
        </div>
        <p className="m-0 flex items-center gap-2 text-neutral-800">
          <span className="flex text-success">
            <Check size={16} />
          </span>
          {address} now forwards here.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn-secondary ${HIT} gap-2 px-4 text-text no-underline hover:text-text`}
          >
            View site <ExternalLink size={16} />
          </a>
        </div>
        <div className="flex flex-col border-t border-divider pt-1">
          <button
            type="button"
            className={`btn btn-ghost ${HIT} gap-2 self-start pl-0 text-text hover:text-text`}
            aria-expanded={tipOpen}
            onClick={() => setTipOpen((open) => !open)}
          >
            <span className="flex text-neutral-700">
              <Search size={16} />
            </span>
            See how Google finds you
            <ChevronDown
              size={16}
              className={`transition-transform duration-[250ms] ${tipOpen ? "rotate-180" : ""}`}
            />
          </button>
          {tipOpen ? (
            <p className="cm-swap mt-1 mb-2 max-w-[640px] text-[15px] leading-[1.6] text-pretty text-neutral-800">
              Google finds new addresses on its own, usually within a few weeks. To speed it up and
              see which searches lead to you, add {view.domain} to Google Search Console,
              Google&apos;s free tool for site owners. It asks you to add one TXT record, the same
              way you added the records here. After that it shows how often you appear in Google
              results and which words people searched for.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={`btn btn-ghost ${HIT} gap-1.5 self-start pl-0 text-danger hover:bg-danger-soft hover:text-danger`}
          onClick={() => setDialog("remove")}
        >
          <Trash size={16} />
          Remove domain
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="m-0 font-heading text-2xl leading-none font-semibold uppercase">
          Custom domain
        </h2>
        {tag ? <span className={`tag ${tag.className}`}>{tag.label}</span> : null}
      </div>
      {steps ? (
        <ol
          aria-label="Progress"
          className="m-0 grid max-w-[640px] list-none grid-cols-3 gap-2 p-0"
        >
          {["Add records", "We check", "Secure and live"].map((label, index) => {
            const state = steps[index]!;
            return (
              <li
                key={label}
                aria-current={state === "cur" || state === "warn" ? "step" : undefined}
                className="flex min-w-0 flex-col gap-2"
              >
                <span
                  className={`block h-[3px] transition-colors duration-[400ms] ${
                    state === "warn"
                      ? "bg-warning"
                      : state === "todo"
                        ? "bg-neutral-300"
                        : "bg-accent"
                  }`}
                />
                <span
                  className={`flex items-center gap-1.5 text-[13px] sm:text-sm ${state === "todo" ? "text-neutral-700" : "text-text"} ${
                    state === "cur" || state === "warn" ? "font-medium" : ""
                  }`}
                >
                  {state === "done" ? (
                    <Check size={14} />
                  ) : state === "warn" ? (
                    <Alert size={14} />
                  ) : null}
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
      {body}

      {view ? (
        <Modal
          open={dialog === "share"}
          labelledBy={`${ids}-share`}
          onClose={() => setDialog(null)}
          onSubmit={() => setDialog(null)}
        >
          <h2
            id={`${ids}-share`}
            className="m-0 font-heading text-[28px] leading-[1.05] font-semibold uppercase"
          >
            Send these steps
          </h2>
          <p className="m-0 text-pretty text-neutral-800">
            Share a page with the records for {view.domain} and the steps for {pName}. Handy for an
            assistant or IT person. It doesn&apos;t give access to your account.
          </p>
          <div className="flex items-stretch border border-divider">
            <code className="flex min-w-0 flex-1 items-center px-3 py-2.5 font-mono text-sm [overflow-wrap:anywhere]">
              {shareLink.replace(/^https?:\/\//, "")}
            </code>
            <button
              type="button"
              className={`btn btn-ghost ${HIT} flex-none gap-1.5 border-l border-divider text-accent-700`}
              onClick={() => copy("share", shareLink)}
            >
              {copied === "share" ? <Check size={16} /> : <Copy size={16} />}
              {copied === "share" ? "Copied" : "Copy link"}
            </button>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={`btn btn-secondary ${HIT} flex-1 px-4 sm:flex-none`}
              onClick={() => setDialog(null)}
            >
              Close
            </button>
            <a
              className={`btn btn-primary ${HIT} flex-1 gap-2 px-4 text-bg no-underline hover:text-bg sm:flex-none`}
              href={`mailto:?subject=${encodeURIComponent(`Connecting ${view.domain} to my website`)}&body=${encodeURIComponent(mailBody)}`}
            >
              <Mail size={18} />
              Open in email
            </a>
          </div>
        </Modal>
      ) : null}
      {view ? (
        <ConfirmDialog
          open={dialog === "remove"}
          title={`Remove ${view.domain}?`}
          confirmLabel="Remove domain"
          pendingLabel="Removing…"
          cancelLabel="Keep domain"
          tone="danger-quiet"
          pending={pending}
          onConfirm={() => remove("remove")}
          onClose={() => setDialog(null)}
        >
          <span className="text-pretty">
            Your site goes back to {address} straight away. Links to {view.domain} stop working
            until you connect it again. The records at your domain provider stay where they are; you
            can delete them there.
          </span>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
