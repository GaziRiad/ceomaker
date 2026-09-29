"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { buttonStyles } from "../components";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      className={buttonStyles.ghost}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
