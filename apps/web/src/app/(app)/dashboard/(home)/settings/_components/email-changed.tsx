"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useToast } from "../../_components/toasts";

/** After the confirmation link: says how it went once, then tidies the address bar. */
export function EmailChanged() {
  const params = useSearchParams();
  const router = useRouter();
  const say = useToast();
  const changed = params.get("email") === "changed";
  const error = params.get("error");

  useEffect(() => {
    if (!changed) return;
    if (!error) say("ok", "Email changed");
    else if (error === "TOKEN_EXPIRED") say("error", "That link has expired. Send a new one.");
    else say("error", "That link didn't work. Send a new one.");
    router.replace("/dashboard/settings/account", { scroll: false });
  }, [changed, error, router, say]);

  return null;
}
