import { randomBytes } from "node:crypto";
import type { Types } from "mongoose";
import type { FormSchema, ProtocolStatus, TimelineKind } from "@/lib/domain";
import { connectDb } from "@/lib/db";
import { parseAnswers } from "@/lib/form-schema";
import { normalizeProtocolCode } from "@/lib/queries";
import {
  applyDeskAction,
  type DeskAction,
  type ItemDecision,
  type ReviewItem,
  type ReviewTarget,
} from "@/lib/review-flow";
import type { SessionUser } from "@/lib/session";
import { createFileStore, documentStorageKey, type ObjectStore } from "@/lib/storage";
import type { IncomingFile } from "@/lib/filing-request";
import { inspectUpload } from "@/lib/uploads";
import { Protocol } from "@/models/Protocol";
import { ProtocolType } from "@/models/ProtocolType";
import { ReviewSection } from "@/models/ReviewSection";
import { Sector } from "@/models/Sector";
import { TimelineEvent } from "@/models/TimelineEvent";
import { User } from "@/models/User";
import { Workflow } from "@/models/Workflow";

export type { IncomingFile };

const CODE = /^VC-\d{4}-\d{4}$/;

export type InboxFilters = {
  status?: ProtocolStatus;
  sector?: string;
  type?: string;
};

export type InboxRow = {
  code: string;
  status: ProtocolStatus;
  serviceName: string;
  typeKey: string;
  sectorName: string;
  sectorKey: string;
  applicantName: string;
  assigneeName: string | null;
  updatedAt: string;
};

export type InboxView = {
  rows: InboxRow[];
  sectors: { key: string; name: string }[];
  services: { key: string; name: string }[];
};

export type OpenCorrection = {
  kind: "section" | "document";
  key: string;
  label: string;
  comment: string;
};

export type DeskTarget = {
  kind: "section" | "document";
  key: string;
  label: string;
  body: string;
  stored: boolean;
  decision: ItemDecision;
  comment: string;
};

export type DeskCase = {
  code: string;
  serviceName: string;
  status: ProtocolStatus;
  applicantName: string;
  assigneeName: string | null;
  currentSectorKey: string;
  currentSectorName: string;
  currentStageKey: string;
  stages: { key: string; sectorName: string }[];
  nextSectorName: string | null;
  canClaim: boolean;
  canReview: boolean;
  targets: DeskTarget[];
};

export type DeskMutation =
  | { ok: true }
  | {
      ok: false;
      status: number;
      error: string;
      issues?: { path: string; message: string }[];
    };

export function coversDesk(user: SessionUser, sectorKey: string): boolean {
  if (user.role === "admin") {
    return true;
  }
  return user.role === "analyst" && user.sectorKeys.includes(sectorKey);
}

export async function listInbox(
  user: SessionUser,
  filters: InboxFilters,
): Promise<InboxView | null> {
  if (user.role !== "analyst" && user.role !== "admin") {
    return null;
  }
  await connectDb();
  const [sectors, services] = await Promise.all([
    Sector.find({ active: true }).sort({ order: 1 }).lean(),
    ProtocolType.find().sort({ name: 1 }).select("key name").lean(),
  ]);
  const allowed =
    user.role === "admin" ? sectors.map((sector) => sector.key) : user.sectorKeys;
  const sectorFilter =
    filters.sector && allowed.includes(filters.sector) ? [filters.sector] : allowed;
  if (filters.status === "draft" || sectorFilter.length === 0) {
    return {
      rows: [],
      sectors: sectors.filter((sector) => allowed.includes(sector.key)),
      services: services.map((service) => ({ key: service.key, name: service.name })),
    };
  }

  const query: Record<string, unknown> = {
    currentSectorKey: { $in: sectorFilter },
    status: filters.status ?? { $ne: "draft" },
  };
  if (filters.type) {
    query.typeKey = filters.type;
  }
  const protocols = await Protocol.find(query).sort({ updatedAt: -1 }).lean();
  const names = new Map(sectors.map((sector) => [sector.key, sector.name]));
  const serviceNames = new Map(services.map((service) => [service.key, service.name]));

  return {
    rows: protocols.map((protocol) => ({
      code: protocol.code,
      status: protocol.status,
      serviceName: serviceNames.get(protocol.typeKey) ?? protocol.typeKey,
      typeKey: protocol.typeKey,
      sectorName: names.get(protocol.currentSectorKey) ?? protocol.currentSectorKey,
      sectorKey: protocol.currentSectorKey,
      applicantName: protocol.applicantName,
      assigneeName: protocol.assigneeName ?? null,
      updatedAt: (protocol.updatedAt ?? protocol.createdAt ?? new Date()).toISOString(),
    })),
    sectors: sectors
      .filter((sector) => allowed.includes(sector.key))
      .map((sector) => ({ key: sector.key, name: sector.name })),
    services: services.map((service) => ({ key: service.key, name: service.name })),
  };
}

export async function readDeskCase(
  code: string,
  user: SessionUser,
): Promise<DeskCase | null> {
  const loaded = await loadCase(code);
  if (!loaded || !coversDesk(user, loaded.protocol.currentSectorKey)) {
    return null;
  }
  const reviews = await ReviewSection.find({
    protocol: loaded.protocol._id,
    stageKey: loaded.protocol.currentStageKey,
  }).lean();
  return toDeskCase(loaded, user, reviews);
}

export async function claimProtocol(
  code: string,
  user: SessionUser,
): Promise<DeskMutation> {
  const loaded = await loadCase(code);
  if (!loaded || !coversDesk(user, loaded.protocol.currentSectorKey)) {
    return { ok: false, status: 404, error: "That protocol is not in your inbox." };
  }
  const result = applyDeskAction({
    snapshot: snapshotOf(loaded.protocol),
    stages: loaded.workflow.stages,
    expected: expectedTargets(loaded),
    items: [],
    action: { type: "claim" },
    actorName: user.name,
    sectorName: loaded.sectorName,
  });
  if (!result.ok) {
    return { ok: false, status: 409, error: result.error };
  }
  return commitMove(loaded, user, result.move, []);
}

export async function actOnProtocol(input: {
  code: string;
  user: SessionUser;
  action: DeskAction | { type: "save" };
  items: ReviewItem[];
}): Promise<DeskMutation> {
  const loaded = await loadCase(input.code);
  if (!loaded || !coversDesk(input.user, loaded.protocol.currentSectorKey)) {
    return { ok: false, status: 404, error: "That protocol is not in your inbox." };
  }
  if (
    loaded.protocol.assignee &&
    loaded.protocol.assignee.toString() !== input.user.id &&
    input.user.role !== "admin"
  ) {
    return {
      ok: false,
      status: 403,
      error: "Another analyst has claimed this protocol.",
    };
  }

  if (input.action.type === "save") {
    if (loaded.protocol.status !== "in_review") {
      return { ok: false, status: 409, error: "Claim the protocol before saving notes." };
    }
    const known = expectedTargets(loaded);
    if (
      input.items.some(
        (item) =>
          !known.some(
            (target) =>
              target.kind === item.target.kind && target.key === item.target.key,
          ),
      )
    ) {
      return { ok: false, status: 400, error: "Unknown review target." };
    }
    await persistItems(
      loaded.protocol._id,
      loaded.protocol.currentStageKey,
      input.items,
      input.user.id,
    );
    return { ok: true };
  }

  const next = stageAfterName(loaded);
  const result = applyDeskAction({
    snapshot: snapshotOf(loaded.protocol),
    stages: loaded.workflow.stages,
    expected: expectedTargets(loaded),
    items: input.items,
    action: input.action,
    actorName: input.user.name,
    sectorName: loaded.sectorName,
    nextSectorName: next ?? undefined,
  });
  if (!result.ok) {
    return { ok: false, status: 409, error: result.error };
  }
  const items = input.action.type === "reject" ? [] : input.items;
  return commitMove(loaded, input.user, result.move, items);
}

export async function resubmitCorrections(input: {
  code: string;
  user: SessionUser;
  answers: unknown;
  files: IncomingFile[];
  store?: ObjectStore;
  now?: Date;
}): Promise<DeskMutation> {
  if (input.user.role !== "applicant") {
    return {
      ok: false,
      status: 403,
      error: "Only the applicant can send corrections back.",
    };
  }
  const normalized = normalizeProtocolCode(input.code);
  await connectDb();
  const protocol = await Protocol.findOne({
    code: normalized,
    applicant: input.user.id,
  });
  if (!protocol || protocol.status !== "corrections_requested") {
    return {
      ok: false,
      status: 404,
      error: "This protocol is not waiting for corrections.",
    };
  }

  const loaded = await loadCase(protocol.code);
  if (!loaded) {
    return {
      ok: false,
      status: 404,
      error: "This protocol is not waiting for corrections.",
    };
  }
  const flagged = await openCorrectionKeys(protocol._id, protocol.currentStageKey);
  const merged = mergeAnswers(
    loaded.type.formSchema,
    protocol.answers ?? {},
    input.answers,
    flagged.sections,
  );
  const parsed = parseAnswers(loaded.type.formSchema, merged);
  if (!parsed.ok) {
    return { ok: false, status: 400, error: "Check the form.", issues: parsed.issues };
  }

  const store = input.store ?? createFileStore();
  const replacements: {
    requirementKey: string;
    fileName: string;
    storageKey: string;
    mediaType: string;
    byteSize: number;
    previousKey?: string;
  }[] = [];
  try {
    for (const file of input.files) {
      if (!flagged.documents.has(file.requirementKey)) {
        return {
          ok: false,
          status: 400,
          error: "Only documents sent back for correction can be replaced.",
        };
      }
      const inspected = inspectUpload({
        fileName: file.fileName,
        byteLength: file.bytes.byteLength,
        header: file.bytes,
      });
      if (!inspected.ok) {
        return {
          ok: false,
          status: 400,
          error: inspected.message,
          issues: [
            { path: `documents.${file.requirementKey}`, message: inspected.message },
          ],
        };
      }
      const storageKey = documentStorageKey(
        protocol.code,
        file.requirementKey,
        randomBytes(16).toString("hex"),
      );
      await store.put(storageKey, file.bytes);
      const previous = protocol.attachments.find(
        (item) => item.requirementKey === file.requirementKey,
      );
      replacements.push({
        requirementKey: file.requirementKey,
        fileName: inspected.fileName,
        storageKey,
        mediaType: inspected.mediaType,
        byteSize: file.bytes.byteLength,
        previousKey: previous?.storageKey,
      });
    }
  } catch (error) {
    await Promise.all(
      replacements.map((item) => store.remove(item.storageKey).catch(() => undefined)),
    );
    console.error(
      "Correction upload failed",
      error instanceof Error ? error.name : "Error",
    );
    return { ok: false, status: 503, error: "The corrected file could not be stored." };
  }

  const result = applyDeskAction({
    snapshot: snapshotOf(protocol),
    stages: loaded.workflow.stages,
    expected: expectedTargets(loaded),
    items: [],
    action: { type: "resubmit" },
    actorName: input.user.name,
    sectorName: loaded.sectorName,
  });
  if (!result.ok) {
    await Promise.all(
      replacements.map((item) => store.remove(item.storageKey).catch(() => undefined)),
    );
    return { ok: false, status: 409, error: result.error };
  }

  const attachments = protocol.attachments.map((attachment) => {
    const replacement = replacements.find(
      (item) => item.requirementKey === attachment.requirementKey,
    );
    if (!replacement) {
      return attachment;
    }
    return {
      requirementKey: attachment.requirementKey,
      fileName: replacement.fileName,
      storageKey: replacement.storageKey,
      mediaType: replacement.mediaType,
      byteSize: replacement.byteSize,
    };
  });
  for (const replacement of replacements) {
    if (!attachments.some((item) => item.requirementKey === replacement.requirementKey)) {
      attachments.push({
        requirementKey: replacement.requirementKey,
        fileName: replacement.fileName,
        storageKey: replacement.storageKey,
        mediaType: replacement.mediaType,
        byteSize: replacement.byteSize,
      });
    }
  }

  const previous = {
    status: protocol.status,
    currentStageKey: protocol.currentStageKey,
    currentSectorKey: protocol.currentSectorKey,
    assignee: protocol.assignee,
    assigneeName: protocol.assigneeName,
    answers: protocol.answers,
    attachments: protocol.attachments,
  };
  protocol.status = result.move.status;
  protocol.currentStageKey = result.move.stageKey;
  protocol.currentSectorKey = result.move.sectorKey;
  protocol.assignee = undefined;
  protocol.assigneeName = undefined;
  protocol.answers = parsed.answers;
  protocol.attachments = attachments;
  protocol.markModified("answers");
  protocol.markModified("attachments");
  try {
    await protocol.save();
    await TimelineEvent.create({
      protocol: protocol._id,
      kind: result.move.event.kind,
      title: result.move.event.title,
      detail: result.move.event.detail,
      sectorKey: result.move.event.sectorKey,
      at: input.now ?? new Date(),
      visibility: "public",
    });
  } catch (error) {
    protocol.status = previous.status;
    protocol.currentStageKey = previous.currentStageKey;
    protocol.currentSectorKey = previous.currentSectorKey;
    protocol.assignee = previous.assignee;
    protocol.assigneeName = previous.assigneeName;
    protocol.answers = previous.answers;
    protocol.attachments = previous.attachments;
    await protocol.save().catch(() => undefined);
    await Promise.all(
      replacements.map((item) => store.remove(item.storageKey).catch(() => undefined)),
    );
    console.error(
      "Correction resubmit failed",
      error instanceof Error ? error.name : "Error",
    );
    return { ok: false, status: 503, error: "The corrections could not be sent back." };
  }

  await Promise.all(
    replacements
      .map((item) => item.previousKey)
      .filter((key): key is string => Boolean(key))
      .map((key) => store.remove(key).catch(() => undefined)),
  );
  return { ok: true };
}

export async function readReviewerFile(input: {
  user: SessionUser;
  code: string;
  requirementKey: string;
}): Promise<{ storageKey: string; fileName: string; mediaType: string } | null> {
  const normalized = normalizeProtocolCode(input.code);
  if (!CODE.test(normalized)) {
    return null;
  }
  await connectDb();
  const protocol = await Protocol.findOne({ code: normalized }).lean();
  if (!protocol || !coversDesk(input.user, protocol.currentSectorKey)) {
    return null;
  }
  const attachment = protocol.attachments.find(
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

export async function listOpenCorrections(code: string): Promise<OpenCorrection[]> {
  const normalized = normalizeProtocolCode(code);
  if (!CODE.test(normalized)) {
    return [];
  }
  await connectDb();
  const protocol = await Protocol.findOne({ code: normalized }).lean();
  if (!protocol || protocol.status !== "corrections_requested") {
    return [];
  }
  const [type, reviews] = await Promise.all([
    ProtocolType.findOne({ key: protocol.typeKey }).lean(),
    ReviewSection.find({
      protocol: protocol._id,
      stageKey: protocol.currentStageKey,
      decision: "changes_requested",
    }).lean(),
  ]);
  return reviews.flatMap((review) => {
    const comment = review.notes.at(-1)?.body?.trim();
    if (!comment) {
      return [];
    }
    const kind = review.targetKind ?? "section";
    const label =
      kind === "document"
        ? (type?.documents.find((document) => document.key === review.sectionKey)
            ?.label ?? review.sectionKey)
        : (type?.formSchema.sections.find((section) => section.key === review.sectionKey)
            ?.title ?? review.sectionKey);
    return [{ kind, key: review.sectionKey, label, comment }];
  });
}

export async function readCorrectionDraft(code: string, userId: string) {
  const normalized = normalizeProtocolCode(code);
  await connectDb();
  const protocol = await Protocol.findOne({
    code: normalized,
    applicant: userId,
    status: "corrections_requested",
  }).lean();
  if (!protocol) {
    return null;
  }
  const type = await ProtocolType.findOne({ key: protocol.typeKey }).lean();
  if (!type) {
    return null;
  }
  const corrections = await listOpenCorrections(protocol.code);
  return {
    code: protocol.code,
    serviceName: type.name,
    sections: type.formSchema.sections,
    documents: type.documents,
    answers: protocol.answers ?? {},
    attachments: protocol.attachments.map((item) => ({
      key: item.requirementKey,
      fileName: item.fileName,
    })),
    corrections,
  };
}

async function commitMove(
  loaded: LoadedCase,
  user: SessionUser,
  move: {
    status: ProtocolStatus;
    stageKey: string;
    sectorKey: string;
    assigneeHeld: boolean;
    event: { kind: string; title: string; detail: string; sectorKey: string };
  },
  items: ReviewItem[],
): Promise<DeskMutation> {
  const protocol = loaded.protocol;
  const previous = {
    status: protocol.status,
    currentStageKey: protocol.currentStageKey,
    currentSectorKey: protocol.currentSectorKey,
    assignee: protocol.assignee ?? null,
    assigneeName: protocol.assigneeName ?? null,
  };
  const updated = await Protocol.findOneAndUpdate(
    {
      _id: protocol._id,
      status: previous.status,
      currentStageKey: previous.currentStageKey,
    },
    {
      $set: {
        status: move.status,
        currentStageKey: move.stageKey,
        currentSectorKey: move.sectorKey,
        assignee: move.assigneeHeld ? user.id : null,
        assigneeName: move.assigneeHeld ? user.name : null,
      },
    },
  );
  if (!updated) {
    return {
      ok: false,
      status: 409,
      error: "This protocol changed. Refresh and try again.",
    };
  }
  try {
    await TimelineEvent.create({
      protocol: protocol._id,
      kind: move.event.kind as TimelineKind,
      title: move.event.title,
      detail: move.event.detail,
      sectorKey: move.event.sectorKey,
      at: new Date(),
      visibility: "public",
    });
    if (items.length > 0) {
      await persistItems(protocol._id, previous.currentStageKey, items, user.id);
    }
  } catch (error) {
    await Protocol.updateOne({ _id: protocol._id }, { $set: previous });
    console.error("Desk update failed", error instanceof Error ? error.name : "Error");
    return { ok: false, status: 503, error: "The review could not be saved." };
  }
  return { ok: true };
}

async function persistItems(
  protocolId: Types.ObjectId,
  stageKey: string,
  items: ReviewItem[],
  authorId: string,
): Promise<void> {
  const author = await User.findById(authorId).select("_id");
  if (!author) {
    return;
  }
  for (const item of items) {
    const existing = await ReviewSection.findOne({
      protocol: protocolId,
      stageKey,
      sectionKey: item.target.key,
      $or: [
        { targetKind: item.target.kind },
        ...(item.target.kind === "section"
          ? [{ targetKind: { $exists: false } }, { targetKind: null }]
          : []),
      ],
    });
    const comment = item.comment.trim();
    const notes = [...(existing?.notes ?? [])];
    const last = notes.at(-1);
    if (comment && last?.body !== comment) {
      notes.push({ author: author._id, body: comment, createdAt: new Date() });
    }
    if (existing) {
      existing.targetKind = item.target.kind;
      existing.decision = item.decision;
      existing.notes = notes;
      await existing.save();
      continue;
    }
    await ReviewSection.create({
      protocol: protocolId,
      stageKey,
      targetKind: item.target.kind,
      sectionKey: item.target.key,
      decision: item.decision,
      notes,
    });
  }
}

type LoadedCase = {
  protocol: {
    _id: Types.ObjectId;
    code: string;
    status: ProtocolStatus;
    typeKey: string;
    applicantName: string;
    assignee?: { toString(): string } | null;
    assigneeName?: string | null;
    currentStageKey: string;
    currentSectorKey: string;
    answers?: Record<string, Record<string, string | number | boolean>>;
    attachments: {
      requirementKey: string;
      fileName: string;
      storageKey?: string;
    }[];
  };
  type: {
    name: string;
    formSchema: FormSchema;
    documents: { key: string; label: string }[];
  };
  workflow: { stages: { key: string; sectorKey: string; order: number }[] };
  sectorName: string;
  sectorNames: Map<string, string>;
};

async function loadCase(code: string): Promise<LoadedCase | null> {
  const normalized = normalizeProtocolCode(code);
  if (!CODE.test(normalized)) {
    return null;
  }
  await connectDb();
  const protocol = await Protocol.findOne({ code: normalized }).lean();
  if (!protocol || protocol.status === "draft") {
    return null;
  }
  const type = await ProtocolType.findOne({ key: protocol.typeKey }).lean();
  if (!type) {
    return null;
  }
  const [workflow, sectors] = await Promise.all([
    Workflow.findOne({ key: type.workflowKey }).lean(),
    Sector.find().lean(),
  ]);
  if (!workflow) {
    return null;
  }
  const sectorNames = new Map(sectors.map((sector) => [sector.key, sector.name]));
  return {
    protocol,
    type,
    workflow,
    sectorName: sectorNames.get(protocol.currentSectorKey) ?? protocol.currentSectorKey,
    sectorNames,
  };
}

function toDeskCase(
  loaded: LoadedCase,
  user: SessionUser,
  reviews: {
    targetKind?: "section" | "document";
    sectionKey: string;
    decision: ItemDecision;
    notes: { body: string }[];
  }[],
): DeskCase {
  const { protocol } = loaded;
  const ordered = [...loaded.workflow.stages].sort(
    (left, right) => left.order - right.order,
  );
  const index = ordered.findIndex((stage) => stage.key === protocol.currentStageKey);
  const next = index >= 0 ? ordered[index + 1] : undefined;
  const mine =
    !protocol.assignee ||
    protocol.assignee.toString() === user.id ||
    user.role === "admin";
  const answers = protocol.answers ?? {};
  const targets: DeskTarget[] = expectedTargets(loaded).map((target) => {
    const saved = reviews.find(
      (review) =>
        (review.targetKind ?? "section") === target.kind &&
        review.sectionKey === target.key,
    );
    if (target.kind === "section") {
      const section = loaded.type.formSchema.sections.find(
        (item) => item.key === target.key,
      );
      const body = (section?.fields ?? [])
        .map(
          (field) =>
            `${field.label}: ${formatDeskBody(field.kind, answers[target.key]?.[field.key])}`,
        )
        .join("\n");
      return {
        kind: target.kind,
        key: target.key,
        label: section?.title ?? target.key,
        body,
        stored: false,
        decision: saved?.decision ?? "pending",
        comment: saved?.notes.at(-1)?.body ?? "",
      };
    }
    const document = loaded.type.documents.find((item) => item.key === target.key);
    const attachment = protocol.attachments.find(
      (item) => item.requirementKey === target.key,
    );
    return {
      kind: target.kind,
      key: target.key,
      label: document?.label ?? target.key,
      body: attachment
        ? `File on record: ${attachment.fileName}`
        : "No file is stored for this document.",
      stored: Boolean(attachment?.storageKey),
      decision: saved?.decision ?? "pending",
      comment: saved?.notes.at(-1)?.body ?? "",
    };
  });
  return {
    code: protocol.code,
    serviceName: loaded.type.name,
    status: protocol.status,
    applicantName: protocol.applicantName,
    assigneeName: protocol.assigneeName ?? null,
    currentSectorKey: protocol.currentSectorKey,
    currentSectorName: loaded.sectorName,
    currentStageKey: protocol.currentStageKey,
    stages: ordered.map((stage) => ({
      key: stage.key,
      sectorName: loaded.sectorNames.get(stage.sectorKey) ?? stage.sectorKey,
    })),
    nextSectorName: next
      ? (loaded.sectorNames.get(next.sectorKey) ?? next.sectorKey)
      : null,
    canClaim:
      protocol.status === "submitted" &&
      !protocol.assignee &&
      coversDesk(user, protocol.currentSectorKey),
    canReview: protocol.status === "in_review" && mine,
    targets,
  };
}

function expectedTargets(loaded: LoadedCase): ReviewTarget[] {
  return [
    ...loaded.type.formSchema.sections.map((section) => ({
      kind: "section" as const,
      key: section.key,
    })),
    ...loaded.type.documents.map((document) => ({
      kind: "document" as const,
      key: document.key,
    })),
  ];
}

function stageAfterName(loaded: LoadedCase): string | null {
  const ordered = [...loaded.workflow.stages].sort(
    (left, right) => left.order - right.order,
  );
  const index = ordered.findIndex(
    (stage) => stage.key === loaded.protocol.currentStageKey,
  );
  const next = ordered[index + 1];
  if (!next) {
    return null;
  }
  return loaded.sectorNames.get(next.sectorKey) ?? next.sectorKey;
}

function snapshotOf(protocol: {
  status: ProtocolStatus;
  currentStageKey: string;
  currentSectorKey: string;
  assignee?: unknown;
}): {
  status: ProtocolStatus;
  stageKey: string;
  sectorKey: string;
  assigneeHeld: boolean;
} {
  return {
    status: protocol.status,
    stageKey: protocol.currentStageKey,
    sectorKey: protocol.currentSectorKey,
    assigneeHeld: Boolean(protocol.assignee),
  };
}

async function openCorrectionKeys(protocolId: Types.ObjectId, stageKey: string) {
  const reviews = await ReviewSection.find({
    protocol: protocolId,
    stageKey,
    decision: "changes_requested",
  }).lean();
  return {
    sections: new Set(
      reviews
        .filter((review) => (review.targetKind ?? "section") === "section")
        .map((review) => review.sectionKey),
    ),
    documents: new Set(
      reviews
        .filter((review) => review.targetKind === "document")
        .map((review) => review.sectionKey),
    ),
  };
}

function mergeAnswers(
  form: LoadedCase["type"]["formSchema"],
  stored: Record<string, Record<string, string | number | boolean>>,
  submitted: unknown,
  editable: Set<string>,
): unknown {
  const source =
    submitted && typeof submitted === "object" && !Array.isArray(submitted)
      ? (submitted as Record<string, unknown>)
      : {};
  const merged: Record<string, unknown> = {};
  for (const section of form.sections) {
    const storedSection = stored[section.key] ?? {};
    const incoming = source[section.key];
    if (editable.has(section.key) && incoming && typeof incoming === "object") {
      merged[section.key] = incoming;
    } else {
      merged[section.key] = storedSection;
    }
  }
  return merged;
}

export function formatDeskBody(kind: string, value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "Not provided";
  }
  if (kind === "boolean") {
    return value === true ? "Yes" : "No";
  }
  return String(value);
}
