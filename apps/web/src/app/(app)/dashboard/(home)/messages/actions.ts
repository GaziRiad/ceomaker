"use server";

import { getDb, listContactMessages, setContactMessageRead } from "@ceomaker/db";
import { getSession } from "@/lib/auth";
import { isUuid } from "@/lib/site-data";
import { toInboxMessage, type InboxMessage } from "./inbox-data";

type Failure = { ok: false; error: string };
const SIGNED_OUT: Failure = { ok: false, error: "Your session ended. Sign in again." };

/** The next, older page of the inbox, continuing where the list stops. */
export async function loadOlderMessagesAction(
  siteId: string,
  topic: string | null,
  before: string,
): Promise<{ ok: true; rows: InboxMessage[]; nextCursor: string | null } | Failure> {
  const session = await getSession();
  if (!session) return SIGNED_OUT;
  if (!isUuid(siteId)) return { ok: false, error: "This site no longer exists." };
  const page = await listContactMessages(getDb(), {
    userId: session.user.id,
    siteId,
    topic: typeof topic === "string" ? topic.slice(0, 40) : null,
    before: String(before).slice(0, 100),
  });
  return {
    ok: true,
    rows: page.rows.map(toInboxMessage),
    nextCursor: page.nextCursor,
  };
}

/** Marks a message read (opened, replied to) or new again. */
export async function setMessageReadAction(
  messageId: string,
  read: boolean,
): Promise<{ ok: true } | Failure> {
  const session = await getSession();
  if (!session) return SIGNED_OUT;
  if (typeof messageId !== "string" || !isUuid(messageId)) {
    return { ok: false, error: "This message was deleted." };
  }
  const updated = await setContactMessageRead(getDb(), {
    userId: session.user.id,
    messageId,
    read: Boolean(read),
  });
  return updated ? { ok: true } : { ok: false, error: "This message was deleted." };
}
