import { MAX_UPLOAD_BYTES } from "./uploads";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type IncomingFile = {
  requirementKey: string;
  fileName: string;
  bytes: Uint8Array;
};

export type ReadSubmission = {
  typeKey: string;
  answers: unknown;
  files: IncomingFile[];
  issues: { path: string; message: string }[];
};

/** Pull the service, the answer JSON, and one file per document slot out of the form. */
export async function readSubmission(formData: FormData): Promise<ReadSubmission> {
  const issues: { path: string; message: string }[] = [];
  const typeField = formData.get("typeKey");
  const typeKey = typeof typeField === "string" ? typeField.trim() : "";
  if (!SLUG.test(typeKey)) {
    issues.push({ path: "typeKey", message: "Choose a service." });
  }

  const answersField = formData.get("answers");
  let answers: unknown = null;
  if (typeof answersField !== "string") {
    issues.push({ path: "answers", message: "The form answers are missing." });
  } else {
    try {
      answers = JSON.parse(answersField) as unknown;
    } catch {
      issues.push({ path: "answers", message: "The form answers could not be read." });
    }
  }

  const files: IncomingFile[] = [];
  const seen = new Set<string>();
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("document.")) {
      continue;
    }
    const requirementKey = key.slice("document.".length);
    if (!SLUG.test(requirementKey)) {
      issues.push({ path: "documents", message: "A document slot name is not valid." });
      continue;
    }
    if (!(value instanceof File)) {
      issues.push({
        path: `documents.${requirementKey}`,
        message: "Upload a file.",
      });
      continue;
    }
    if (value.size === 0 && value.name === "") {
      continue;
    }
    if (value.size > MAX_UPLOAD_BYTES) {
      issues.push({
        path: `documents.${requirementKey}`,
        message: "This file is larger than 5 MB.",
      });
      continue;
    }
    if (seen.has(requirementKey)) {
      issues.push({
        path: `documents.${requirementKey}`,
        message: "Send one file for each document.",
      });
      continue;
    }
    seen.add(requirementKey);
    files.push({
      requirementKey,
      fileName: value.name,
      bytes: new Uint8Array(await value.arrayBuffer()),
    });
  }

  return { typeKey, answers, files, issues };
}
