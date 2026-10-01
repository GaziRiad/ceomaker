import type { ContactMessageRow } from "@ceomaker/db";

/** A message as the inbox holds it on the client. */
export interface InboxMessage {
  id: string;
  name: string;
  email: string;
  organisation: string | null;
  topic: string | null;
  message: string;
  /** ISO timestamp. */
  createdAt: string;
  unread: boolean;
}

export function toInboxMessage(row: ContactMessageRow): InboxMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    organisation: row.organisation,
    topic: row.topic,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    unread: row.readAt === null,
  };
}
