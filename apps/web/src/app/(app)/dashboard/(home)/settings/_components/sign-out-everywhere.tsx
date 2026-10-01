"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "@/components/icons";
import { clearFlow } from "../../../../start/storage";
import { useToast } from "../../_components/toasts";
import { signOutEverywhereAction } from "../actions";

/** Ends every session, this one included, then leaves the dashboard. */
export function SignOutEverywhere() {
  const router = useRouter();
  const say = useToast();
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const result = await signOutEverywhereAction().catch(() => ({
        ok: false as const,
        error: "Couldn't reach the server. Try again.",
      }));
      if (!result.ok) {
        say("error", result.error);
        return;
      }
      clearFlow();
      router.replace("/sign-in");
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      className="btn btn-secondary min-h-11 gap-2 self-start px-4 sm:min-h-10"
      disabled={pending}
      onClick={run}
    >
      <LogOut size={16} />
      {pending ? "Signing out…" : "Sign out on all devices"}
    </button>
  );
}
