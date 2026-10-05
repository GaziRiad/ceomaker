import "server-only";
import { AwsClient } from "aws4fetch";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { serverEnv } from "@/lib/env";

// Where uploaded images' bytes live: Cloudflare R2 (S3-compatible), keyed by the media row's
// id. Postgres keeps only the row (owner, type, size). Without R2 settings, development keeps
// files in .media/ at the repository root; production refuses uploads instead.

export interface StoredObject {
  data: Uint8Array<ArrayBuffer>;
  contentType: string;
}

export interface MediaStore {
  put(id: string, data: Uint8Array<ArrayBuffer>, contentType: string): Promise<void>;
  get(id: string): Promise<StoredObject | null>;
  /** Removes objects; missing ones are fine. */
  remove(ids: string[]): Promise<void>;
}

const key = (id: string) => `media/${id}`;

function r2Store(config: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}): MediaStore {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const base = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/`;
  return {
    async put(id, data, contentType) {
      const response = await client.fetch(base + key(id), {
        method: "PUT",
        body: data,
        headers: { "Content-Type": contentType, "Content-Length": String(data.byteLength) },
      });
      if (!response.ok) throw new Error(`R2 upload failed: ${response.status}`);
    },
    async get(id) {
      const response = await client.fetch(base + key(id));
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`R2 read failed: ${response.status}`);
      return {
        data: new Uint8Array(await response.arrayBuffer()),
        contentType: response.headers.get("content-type") ?? "application/octet-stream",
      };
    },
    async remove(ids) {
      for (const id of ids) {
        const response = await client.fetch(base + key(id), { method: "DELETE" });
        if (!response.ok && response.status !== 404) {
          throw new Error(`R2 delete failed: ${response.status}`);
        }
      }
    },
  };
}

/** Development only: files next to the code, so the editor works without an R2 account. */
function localStore(): MediaStore {
  const dir = join(process.cwd(), "../../.media");
  const path = (id: string) => join(dir, id);
  return {
    async put(id, data, contentType) {
      await mkdir(dir, { recursive: true });
      await writeFile(path(id), data);
      await writeFile(`${path(id)}.type`, contentType);
    },
    async get(id) {
      try {
        const [data, contentType] = await Promise.all([
          readFile(path(id)),
          readFile(`${path(id)}.type`, "utf8"),
        ]);
        return { data: new Uint8Array(data), contentType };
      } catch {
        return null;
      }
    },
    async remove(ids) {
      for (const id of ids) {
        await rm(path(id), { force: true });
        await rm(`${path(id)}.type`, { force: true });
      }
    },
  };
}

let cached: MediaStore | null | undefined;

/** The store, or null when uploads aren't set up (production without R2 settings). */
export function mediaStore(): MediaStore | null {
  if (cached !== undefined) return cached;
  const env = serverEnv();
  if (env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET) {
    cached = r2Store({
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucket: env.R2_BUCKET,
    });
  } else {
    cached = process.env.NODE_ENV === "production" ? null : localStore();
  }
  return cached;
}

/** Deletes objects without failing the caller: a leftover file costs little and is logged. */
export async function removeMedia(ids: string[]): Promise<void> {
  if (!ids.length) return;
  try {
    await mediaStore()?.remove(ids);
  } catch (error) {
    console.error("Media cleanup failed", ids.length, error);
  }
}
