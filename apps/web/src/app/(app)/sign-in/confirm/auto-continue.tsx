"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** How long before the button shows, in case the post didn't go (or is slow). */
const BUTTON_DELAY_MS = 4000;

/**
 * Posts the sign-in form as soon as the page runs, so the person sees no extra step. Only a
 * browser running the page's script gets here; link scanners that just fetch the page don't.
 * The button appears after a few seconds (or straight away without scripts) as a way through.
 */
export function AutoContinue({ action, children }: { action: string; children: ReactNode }) {
  const form = useRef<HTMLFormElement>(null);
  // Posted once: a second post would find the link already used.
  const posted = useRef(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (!posted.current) {
      posted.current = true;
      form.current?.requestSubmit();
    }
    const timer = window.setTimeout(() => setShowButton(true), BUTTON_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const button = (
    <button
      type="submit"
      className="btn btn-primary"
      style={{ justifyContent: "center", padding: "13px 16px", fontSize: 16 }}
    >
      Sign in to CEOMaker
    </button>
  );

  return (
    <form ref={form} method="post" action={action} className="flex flex-col">
      {children}
      {showButton ? button : <noscript>{button}</noscript>}
    </form>
  );
}
