"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  chooseConsent,
  consentRegion,
  cookiesAllowed,
  storedChoice,
  type ConsentRegion,
} from "@/lib/consent";

const COPY =
  "We use cookies to see how CEOMaker is used and to measure our ads. We never sell your data.";

/**
 * The cookie banner, until a choice is made (see lib/consent.ts). In the EEA, UK and Switzerland:
 * Accept and Reject, equally easy. Elsewhere: a notice with "I understand"; rejecting stays
 * possible on the privacy page.
 */
export function CookieConsent() {
  const [region, setRegion] = useState<ConsentRegion | null>(null);

  // Read after hydration: the server can't know this browser's choice.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from storage */
    if (!storedChoice()) setRegion(consentRegion());
  }, []);

  if (!region) return null;
  const choose = (choice: "granted" | "denied") => {
    chooseConsent(choice);
    setRegion(null);
  };

  return (
    <section
      aria-label="Cookies"
      className="fixed bottom-4 left-4 z-50 flex w-[min(380px,calc(100vw-32px))] flex-col gap-3.5 border border-divider bg-neutral-100 p-5 shadow-lg"
    >
      <h2 className="m-0 text-lg font-semibold">Your privacy choices</h2>
      <p className="m-0 text-[15px] leading-normal text-neutral-800">
        {COPY}{" "}
        {region === "eu" ? "Accept, or reject and we'll count your visit without cookies. " : null}
        See our{" "}
        <Link href="/privacy#cookies" className="underline underline-offset-4">
          privacy policy
        </Link>
        .
      </p>
      {region === "eu" ? (
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            className="btn btn-secondary justify-center"
            onClick={() => choose("denied")}
          >
            Reject
          </button>
          <button
            type="button"
            className="btn btn-secondary justify-center"
            onClick={() => choose("granted")}
          >
            Accept
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-primary justify-center"
          onClick={() => choose("granted")}
        >
          I understand
        </button>
      )}
    </section>
  );
}

/** On the privacy page: the current choice, and a way to change it. */
export function CookieSettings() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from storage */
    setAllowed(cookiesAllowed());
  }, []);

  if (allowed === null) return null;
  const choose = (choice: "granted" | "denied") => {
    chooseConsent(choice);
    setAllowed(choice === "granted");
  };

  return (
    <span className="mt-3 flex flex-wrap items-center gap-3 border border-divider p-3.5 text-[15px]">
      <span className="flex-1">
        On this browser, cookies are <strong>{allowed ? "allowed" : "not allowed"}</strong>.
      </span>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => choose(allowed ? "denied" : "granted")}
      >
        {allowed ? "Don't allow cookies" : "Allow cookies"}
      </button>
    </span>
  );
}
