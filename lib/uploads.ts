import type { DocumentRequirement } from "./domain";

/** Files an applicant may attach. The server checks the bytes, not the browser's label. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ACCEPTED = [
  { mediaType: "application/pdf", extensions: ["pdf"] },
  { mediaType: "image/jpeg", extensions: ["jpg", "jpeg"] },
  { mediaType: "image/png", extensions: ["png"] },
] as const;

export type AcceptedMediaType = (typeof ACCEPTED)[number]["mediaType"];

export const UPLOAD_ACCEPT = ".pdf,.jpg,.jpeg,.png";
export const UPLOAD_HINT = "PDF, JPEG, or PNG. 5 MB at most.";

export type UploadIssue = { path: string; message: string };

export type InspectedUpload =
  | { ok: true; fileName: string; mediaType: AcceptedMediaType }
  | { ok: false; message: string };

export function inspectUpload(input: {
  fileName: string;
  byteLength: number;
  header: Uint8Array;
}): InspectedUpload {
  if (input.byteLength <= 0) {
    return { ok: false, message: "The file is empty." };
  }
  if (input.byteLength > MAX_UPLOAD_BYTES) {
    return { ok: false, message: "This file is larger than 5 MB." };
  }

  const fileName = safeFileName(input.fileName);
  if (!fileName) {
    return { ok: false, message: "Use a PDF, JPEG, or PNG file name." };
  }

  const mediaType = mediaTypeFromHeader(input.header);
  if (!mediaType) {
    return { ok: false, message: "Choose a PDF, JPEG, or PNG." };
  }

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const match = ACCEPTED.find((item) => item.mediaType === mediaType);
  if (!match?.extensions.some((item) => item === extension)) {
    return { ok: false, message: "The file contents do not match its extension." };
  }

  return { ok: true, fileName, mediaType };
}

export function checkUploads(
  documents: readonly DocumentRequirement[],
  files: readonly {
    requirementKey: string;
    fileName: string;
    byteLength: number;
    header: Uint8Array;
  }[],
):
  | {
      ok: true;
      files: { requirementKey: string; fileName: string; mediaType: AcceptedMediaType }[];
    }
  | { ok: false; issues: UploadIssue[] } {
  const issues = documentIssues(
    documents,
    files.map((file) => file.requirementKey),
  );
  const accepted: {
    requirementKey: string;
    fileName: string;
    mediaType: AcceptedMediaType;
  }[] = [];

  for (const file of files) {
    const inspected = inspectUpload(file);
    if (!inspected.ok) {
      issues.push({
        path: `documents.${file.requirementKey}`,
        message: inspected.message,
      });
      continue;
    }
    accepted.push({
      requirementKey: file.requirementKey,
      fileName: inspected.fileName,
      mediaType: inspected.mediaType,
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, files: accepted };
}

export function documentIssues(
  documents: readonly DocumentRequirement[],
  uploadedKeys: readonly string[],
): UploadIssue[] {
  const issues: UploadIssue[] = [];
  const known = new Set(documents.map((document) => document.key));
  const counts = new Map<string, number>();

  for (const key of uploadedKeys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!known.has(key)) {
      issues.push({
        path: `documents.${key}`,
        message: "This service does not ask for that document.",
      });
    }
  }

  for (const [key, count] of counts) {
    if (count > 1) {
      issues.push({
        path: `documents.${key}`,
        message: "Send one file for each document.",
      });
    }
  }

  for (const document of documents) {
    if (document.required && !counts.has(document.key)) {
      issues.push({
        path: `documents.${document.key}`,
        message: `${document.label} is required.`,
      });
    }
  }

  return issues;
}

function safeFileName(original: string): string | null {
  const base = original.split(/[/\\]/).pop() ?? "";
  const cleaned = base
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
  if (!cleaned) {
    return null;
  }
  const dot = cleaned.lastIndexOf(".");
  if (dot <= 0) {
    return null;
  }
  const extension = cleaned.slice(dot + 1).toLowerCase();
  const known = ACCEPTED.some((item) =>
    item.extensions.some((candidate) => candidate === extension),
  );
  if (!known) {
    return null;
  }
  if (cleaned.length <= 80) {
    return cleaned;
  }
  const stem = cleaned.slice(0, Math.max(1, 80 - (extension.length + 1)));
  return `${stem}.${extension}`;
}

function mediaTypeFromHeader(header: Uint8Array): AcceptedMediaType | null {
  if (
    header.length >= 5 &&
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d
  ) {
    return "application/pdf";
  }
  if (
    header.length >= 3 &&
    header[0] === 0xff &&
    header[1] === 0xd8 &&
    header[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return "image/png";
  }
  return null;
}
