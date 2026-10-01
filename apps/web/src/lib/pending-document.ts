/**
 * Hands the optional CV from the template picker to the generating screen. It stays in memory
 * across the client-side navigation and is never stored: it's sent once with the draft request.
 */
let pending: File | null = null;

export function setPendingDocument(file: File | null) {
  pending = file;
}

export function takePendingDocument(): File | null {
  const file = pending;
  pending = null;
  return file;
}

// Below Vercel's 4.5 MB request body limit, with room for the multipart envelope.
export const DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;
export const DOCUMENT_ACCEPT =
  "application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx";
