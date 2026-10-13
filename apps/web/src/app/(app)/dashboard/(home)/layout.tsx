import { countUnreadMessages, getDb } from "@ceomaker/db";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { displayName, initialsFor } from "@/lib/site-data";
import { DashboardBar, DashboardBarSkeleton } from "./_components/dashboard-bar";
import { Toasts } from "./_components/toasts";
import { IdentifyAccount } from "@/components/product-analytics";
import { isAdmin } from "@/lib/admin";

async function Bar() {
  const session = await getSession();
  if (!session) redirect("/sign-in?callbackURL=/dashboard");
  const { user } = session;
  const unread = await countUnreadMessages(getDb(), user.id);
  const name = displayName(user);
  const admin = isAdmin(user);
  return (
    <>
      <IdentifyAccount id={user.id} internal={admin} />
      <DashboardBar
        name={name}
        email={user.email}
        initials={initialsFor(user.name, user.email)}
        unread={unread}
        admin={admin}
      />
    </>
  );
}

/** Overview, Messages and Settings share the header, its tabs and the toasts. */
export default function DashboardHomeLayout({ children }: { children: ReactNode }) {
  return (
    <Toasts>
      <Suspense fallback={<DashboardBarSkeleton />}>
        <Bar />
      </Suspense>
      {/* Body text steps down a size on phones. */}
      <div className="text-base sm:text-[17px]">{children}</div>
    </Toasts>
  );
}
