import { randomBytes } from "node:crypto";
import { connectDb } from "@/lib/db";
import type { FieldKind, ProtocolStatus } from "@/lib/domain";
import { nextProtocolCode, openingSubmission, type FilingFormView } from "@/lib/filing";
import type { IncomingFile } from "@/lib/filing-request";
import { parseAnswers } from "@/lib/form-schema";
import { normalizeProtocolCode } from "@/lib/queries";
import type { SessionUser } from "@/lib/session";
import { createFileStore, documentStorageKey, type ObjectStore } from "@/lib/storage";
import { checkUploads } from "@/lib/uploads";
import { Protocol } from "@/models/Protocol";
import { ProtocolType } from "@/models/ProtocolType";
import { Sector } from "@/models/Sector";
import { TimelineEvent } from "@/models/TimelineEvent";
import { Workflow } from "@/models/Workflow";

export type OpenService = {
  key: string;
  name: string;
  summary: string;
  sectorName: string;
};

export type OwnedProtocolRow = {
  code: string;
  status: ProtocolStatus;
  serviceName: string;
  submittedAt: string | null;
};

export type FiledReceipt = {
  code: string;
  serviceName: string;
  serviceSummary: string;
  status: ProtocolStatus;
  currentSectorName: string;
  currentStageKey: string;
  stages: { key: string; sectorName: string }[];
  sections: {
    key: string;
    title: string;
    fields: { key: string; label: string; value: string }[];
  }[];
  documents: { key: string; label: string; fileName: string; stored: boolean }[];
  timeline: {
    id: string;
    title: string;
    detail: string;
    at: string;
    sectorName: string;
  }[];
};

export type SubmitResult =
  | { ok: true; code: string }
  | {
      ok: false;
      status: number;
      error: string;
      issues?: { path: string; message: string }[];
    };

const CODE = /^VC-\d{4}-\d{4}$/;

export async function listOpenServices(): Promise<OpenService[]> {
  await connectDb();
  const [types, sectors] = await Promise.all([
    ProtocolType.find({ active: true }).sort({ name: 1 }).lean(),
    Sector.find({ active: true }).lean(),
  ]);
  const names = new Map(sectors.map((sector) => [sector.key, sector.name]));
  return types.map((type) => ({
    key: type.key,
    name: type.name,
    summary: type.summary,
    sectorName: names.get(type.catalogSectorKey) ?? type.catalogSectorKey,
  }));
}

export async function readFilingForm(typeKey: string): Promise<FilingFormView | null> {
  await connectDb();
  const type = await ProtocolType.findOne({ key: typeKey, active: true }).lean();
  if (!type) {
    return null;
  }
  const [workflow, sectors] = await Promise.all([
    Workflow.findOne({ key: type.workflowKey }).lean(),
    Sector.find({ active: true }).lean(),
  ]);
  if (!workflow || workflow.stages.length === 0) {
    return null;
  }
  const names = new Map(sectors.map((sector) => [sector.key, sector.name]));
  return {
    key: type.key,
    name: type.name,
    summary: type.summary,
    sections: type.formSchema.sections,
    documents: type.documents,
    stages: [...workflow.stages]
      .sort((left, right) => left.order - right.order)
      .map((stage) => ({
        key: stage.key,
        sectorName: names.get(stage.sectorKey) ?? stage.sectorKey,
      })),
  };
}

export async function listOwnedProtocols(userId: string): Promise<OwnedProtocolRow[]> {
  await connectDb();
  const protocols = await Protocol.find({ applicant: userId })
    .sort({ createdAt: -1 })
    .lean();
  const types = await ProtocolType.find({
    key: { $in: protocols.map((protocol) => protocol.typeKey) },
  }).lean();
  const names = new Map(types.map((type) => [type.key, type.name]));
  return protocols.map((protocol) => ({
    code: protocol.code,
    status: protocol.status,
    serviceName: names.get(protocol.typeKey) ?? protocol.typeKey,
    submittedAt: protocol.submittedAt ? protocol.submittedAt.toISOString() : null,
  }));
}

export async function readFiledReceipt(
  code: string,
  userId: string,
): Promise<FiledReceipt | null> {
  const normalized = normalizeProtocolCode(code);
  if (!CODE.test(normalized)) {
    return null;
  }
  await connectDb();
  const protocol = await Protocol.findOne({ code: normalized, applicant: userId }).lean();
  if (!protocol) {
    return null;
  }

  const [type, sectors, events] = await Promise.all([
    ProtocolType.findOne({ key: protocol.typeKey }).lean(),
    Sector.find().lean(),
    TimelineEvent.find({ protocol: protocol._id }).sort({ at: 1 }).lean(),
  ]);
  const workflow = type ? await Workflow.findOne({ key: type.workflowKey }).lean() : null;
  const sectorNames = new Map(sectors.map((sector) => [sector.key, sector.name]));
  const answers = protocol.answers ?? {};

  return {
    code: protocol.code,
    serviceName: type?.name ?? protocol.typeKey,
    serviceSummary: type?.summary ?? "",
    status: protocol.status,
    currentSectorName:
      sectorNames.get(protocol.currentSectorKey) ?? protocol.currentSectorKey,
    currentStageKey: protocol.currentStageKey,
    stages: workflow
      ? [...workflow.stages]
          .sort((left, right) => left.order - right.order)
          .map((stage) => ({
            key: stage.key,
            sectorName: sectorNames.get(stage.sectorKey) ?? stage.sectorKey,
          }))
      : [],
    sections: (type?.formSchema.sections ?? []).map((section) => ({
      key: section.key,
      title: section.title,
      fields: section.fields.map((field) => ({
        key: field.key,
        label: field.label,
        value: displayAnswer(field.kind, answers[section.key]?.[field.key]),
      })),
    })),
    documents: protocol.attachments.map((attachment) => ({
      key: attachment.requirementKey,
      label:
        type?.documents.find((document) => document.key === attachment.requirementKey)
          ?.label ?? attachment.requirementKey,
      fileName: attachment.fileName,
      stored: Boolean(attachment.storageKey),
    })),
    timeline: events
      .filter((event) => event.visibility === "public")
      .map((event) => ({
        id: event._id.toString(),
        title: event.title,
        detail: event.detail,
        at: event.at.toISOString(),
        sectorName: sectorNames.get(event.sectorKey) ?? event.sectorKey,
      })),
  };
}

export async function readOwnedFile(input: {
  userId: string;
  code: string;
  requirementKey: string;
}): Promise<{ storageKey: string; fileName: string; mediaType: string } | null> {
  const normalized = normalizeProtocolCode(input.code);
  if (!CODE.test(normalized)) {
    return null;
  }
  await connectDb();
  const protocol = await Protocol.findOne({
    code: normalized,
    applicant: input.userId,
  }).lean();
  const attachment = protocol?.attachments.find(
    (item) => item.requirementKey === input.requirementKey,
  );
  if (!attachment?.storageKey || !attachment.mediaType) {
    return null;
  }
  return {
    storageKey: attachment.storageKey,
    fileName: attachment.fileName,
    mediaType: attachment.mediaType,
  };
}

export async function submitProtocol(input: {
  user: SessionUser;
  typeKey: string;
  answers: unknown;
  files: IncomingFile[];
  store?: ObjectStore;
  now?: Date;
}): Promise<SubmitResult> {
  if (input.user.role !== "applicant") {
    return {
      ok: false,
      status: 403,
      error: "Only an applicant can file a protocol.",
    };
  }

  let loaded: Awaited<ReturnType<typeof loadOpenType>>;
  try {
    loaded = await loadOpenType(input.typeKey);
  } catch (error) {
    console.error(
      "Protocol submission failed",
      error instanceof Error ? error.name : "Error",
    );
    return {
      ok: false,
      status: 503,
      error: "The protocol could not be filed. Try again.",
    };
  }
  if (!loaded.type) {
    return { ok: false, status: 404, error: "That service is not open for filing." };
  }
  if (!loaded.workflow) {
    return { ok: false, status: 409, error: "This service has no route yet." };
  }
  const { type, workflow } = loaded;

  const parsed = parseAnswers(type.formSchema, input.answers);
  const uploads = checkUploads(
    type.documents,
    input.files.map((file) => ({
      requirementKey: file.requirementKey,
      fileName: file.fileName,
      byteLength: file.bytes.byteLength,
      header: file.bytes,
    })),
  );
  const issues = [
    ...(parsed.ok ? [] : parsed.issues),
    ...(uploads.ok ? [] : uploads.issues),
  ];
  if (!parsed.ok || !uploads.ok) {
    return { ok: false, status: 400, error: "Check the form.", issues };
  }

  const at = input.now ?? new Date();
  let opening: ReturnType<typeof openingSubmission>;
  try {
    opening = openingSubmission({
      stages: workflow.stages,
      applicantName: input.user.name,
      serviceName: type.name,
      at,
    });
  } catch (error) {
    return {
      ok: false,
      status: 409,
      error: error instanceof Error ? error.message : "This service has no route yet.",
    };
  }

  const store = input.store ?? createFileStore();
  const accepted = new Map(uploads.files.map((file) => [file.requirementKey, file]));
  const year = at.getUTCFullYear();

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await Protocol.find({ code: { $regex: `^VC-${year}-` } })
        .select("code")
        .lean();
      const code = nextProtocolCode(
        existing.map((row) => row.code),
        year,
      );
      const storedKeys: string[] = [];
      try {
        const attachments = [];
        for (const document of type.documents) {
          const file = input.files.find((item) => item.requirementKey === document.key);
          const checked = accepted.get(document.key);
          if (!file || !checked) {
            continue;
          }
          const storageKey = documentStorageKey(
            code,
            document.key,
            randomBytes(16).toString("hex"),
          );
          await store.put(storageKey, file.bytes);
          storedKeys.push(storageKey);
          attachments.push({
            requirementKey: document.key,
            fileName: checked.fileName,
            storageKey,
            mediaType: checked.mediaType,
            byteSize: file.bytes.byteLength,
          });
        }

        const created = await Protocol.create({
          code,
          type: type._id,
          typeKey: type.key,
          applicant: input.user.id,
          applicantName: input.user.name,
          status: opening.status,
          currentStageKey: opening.currentStageKey,
          currentSectorKey: opening.currentSectorKey,
          answers: parsed.answers,
          attachments,
          submittedAt: opening.submittedAt,
        });

        try {
          await TimelineEvent.create({
            protocol: created._id,
            kind: opening.event.kind,
            title: opening.event.title,
            detail: opening.event.detail,
            sectorKey: opening.event.sectorKey,
            at: opening.event.at,
            visibility: opening.event.visibility,
          });
        } catch (error) {
          await Protocol.deleteOne({ _id: created._id });
          throw error;
        }

        return { ok: true, code };
      } catch (error) {
        await removeStored(store, storedKeys);
        if (isDuplicateKey(error) && attempt < 4) {
          continue;
        }
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof Error && /No protocol numbers remain/.test(error.message)) {
      return { ok: false, status: 409, error: error.message };
    }
    console.error(
      "Protocol submission failed",
      error instanceof Error ? error.name : "Error",
    );
    return {
      ok: false,
      status: 503,
      error: "The protocol could not be filed. Try again.",
    };
  }

  return {
    ok: false,
    status: 503,
    error: "The protocol could not be filed. Try again.",
  };
}

async function loadOpenType(typeKey: string) {
  await connectDb();
  const type = await ProtocolType.findOne({ key: typeKey, active: true }).lean();
  if (!type) {
    return { type: null, workflow: null };
  }
  const workflow = await Workflow.findOne({ key: type.workflowKey }).lean();
  return { type, workflow };
}

function displayAnswer(kind: FieldKind, value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "Not provided";
  }
  if (kind === "boolean") {
    return value === true ? "Yes" : "No";
  }
  return String(value);
}

async function removeStored(store: ObjectStore, keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => store.remove(key).catch(() => undefined)));
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}
