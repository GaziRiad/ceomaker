"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { forgetAccount } from "@/lib/product-analytics/browser";
import { clearFlow } from "../start/storage";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      className="btn btn-ghost"
      onClick={async () => {
        setPending(true);
        // Answers saved in this browser for the questions belong to whoever was signed in.
        clearFlow();
        await authClient.signOut();
        forgetAccount();
        router.replace("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
