"use client";

import { useActionState } from "react";
import { buttonStyles } from "../components";
import { claimSite, type ClaimSiteState } from "./actions";

const affixStyles = "flex shrink-0 items-center bg-paper px-3 text-sm text-stone";

/** prefix/suffix frame the name the user types, e.g. "" + name + ".ceomaker.com". */
export function ClaimSiteForm({ prefix, suffix }: { prefix: string; suffix: string }) {
  const [state, action, pending] = useActionState<ClaimSiteState, FormData>(claimSite, {});

  return (
    <form action={action} className="space-y-4">
      <label htmlFor="subdomain" className="block text-sm font-medium">
        Your address
      </label>
      <div className="flex min-h-11 items-stretch overflow-hidden rounded-md border border-line bg-white focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/20">
        {prefix ? (
          <span className={`${affixStyles} max-w-[60%] border-r border-line`} title={prefix}>
            <span className="truncate">{prefix}</span>
          </span>
        ) : null}
        <input
          id="subdomain"
          name="subdomain"
          required
          minLength={3}
          maxLength={40}
          pattern="[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue={state.subdomain}
          placeholder="yourname"
          aria-describedby="subdomain-hint"
          aria-invalid={state.error ? true : undefined}
          className="min-w-0 flex-1 px-3.5 text-base focus:outline-none"
        />
        {suffix ? <span className={`${affixStyles} border-l border-line`}>{suffix}</span> : null}
      </div>
      <p id="subdomain-hint" className="text-xs text-stone">
        3 to 40 characters: lowercase letters, numbers and hyphens.
      </p>
      {state.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={buttonStyles.primary}>
        {pending ? "Claiming…" : "Claim address"}
      </button>
    </form>
  );
}
