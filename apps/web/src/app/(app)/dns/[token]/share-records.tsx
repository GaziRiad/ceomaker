"use client";

import { RecordsTable, useCopy, type RecordRow } from "@/components/dns-records";

export function ShareRecords({ rows }: { rows: RecordRow[] }) {
  const { copied, copy } = useCopy();
  return <RecordsTable rows={rows} copied={copied} copy={copy} />;
}
