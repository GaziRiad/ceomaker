import { strFromU8, unzipSync } from "fflate";

// Below Vercel's 4.5 MB request body limit, with room for the multipart envelope.
export const DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;
const DOCX_XML_MAX_BYTES = 8 * 1024 * 1024;
const TEXT_MAX_CHARS = 60_000;

export type SourceDocument = { kind: "pdf"; base64: string } | { kind: "text"; text: string };

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** Plain text of a .docx body. Only word/document.xml is inflated, with a size cap. */
function docxText(bytes: Uint8Array): string | null {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (file) =>
        file.name === "word/document.xml" && file.originalSize <= DOCX_XML_MAX_BYTES,
    });
  } catch {
    return null;
  }
  const xml = files["word/document.xml"];
  if (!xml) return null;
  const text = strFromU8(xml)
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
      if (entity.startsWith("#x"))
        return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      return XML_ENTITIES[entity.toLowerCase()] ?? match;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text ? text.slice(0, TEXT_MAX_CHARS) : null;
}

/**
 * Reads an uploaded CV by its bytes, never by its claimed name or type: PDFs go to the model
 * as documents, .docx files as extracted text. Anything else is rejected.
 */
export function readSourceDocument(bytes: Uint8Array): SourceDocument | null {
  if (bytes.byteLength === 0 || bytes.byteLength > DOCUMENT_MAX_BYTES) return null;
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { kind: "pdf", base64: Buffer.from(bytes).toString("base64") };
  }
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    const text = docxText(bytes);
    return text ? { kind: "text", text } : null;
  }
  return null;
}
