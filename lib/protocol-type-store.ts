import { connectDb } from "@/lib/db";
import type { ProtocolTypeInput } from "@/lib/protocol-type-input";
import { Protocol } from "@/models/Protocol";
import { ProtocolType } from "@/models/ProtocolType";
import { Sector } from "@/models/Sector";
import { Workflow } from "@/models/Workflow";

export type CatalogChoice = { key: string; name: string };

export type ProtocolTypeSummary = {
  key: string;
  name: string;
  summary: string;
  catalogSectorKey: string;
  workflowKey: string;
  active: boolean;
  sectionCount: number;
  documentCount: number;
};

export async function catalogChoices(): Promise<{
  sectors: CatalogChoice[];
  workflows: CatalogChoice[];
}> {
  await connectDb();
  const [sectors, workflows] = await Promise.all([
    Sector.find({ active: true }).sort({ order: 1 }).lean(),
    Workflow.find().sort({ name: 1 }).lean(),
  ]);
  return {
    sectors: sectors.map((sector) => ({ key: sector.key, name: sector.name })),
    workflows: workflows.map((workflow) => ({ key: workflow.key, name: workflow.name })),
  };
}

export async function listProtocolTypeSummaries(): Promise<ProtocolTypeSummary[]> {
  await connectDb();
  const types = await ProtocolType.find().sort({ name: 1 }).lean();
  return types.map((type) => ({
    key: type.key,
    name: type.name,
    summary: type.summary,
    catalogSectorKey: type.catalogSectorKey,
    workflowKey: type.workflowKey,
    active: type.active,
    sectionCount: type.formSchema.sections.length,
    documentCount: type.documents.length,
  }));
}

export async function readProtocolTypeInput(
  key: string,
): Promise<ProtocolTypeInput | null> {
  await connectDb();
  const type = await ProtocolType.findOne({ key }).lean();
  if (!type) {
    return null;
  }
  return {
    key: type.key,
    name: type.name,
    summary: type.summary,
    catalogSectorKey: type.catalogSectorKey,
    workflowKey: type.workflowKey,
    active: type.active,
    formSchema: {
      sections: type.formSchema.sections.map((section) => ({
        key: section.key,
        title: section.title,
        description: section.description || undefined,
        fields: section.fields.map((field) => ({
          key: field.key,
          label: field.label,
          kind: field.kind,
          required: field.required,
          help: field.help || undefined,
          options: field.options && field.options.length > 0 ? field.options : undefined,
        })),
      })),
    },
    documents: type.documents.map((document) => ({
      key: document.key,
      label: document.label,
      detail: document.detail,
      required: document.required,
    })),
  };
}

export async function writeProtocolType(
  input: ProtocolTypeInput,
  mode: "create" | "update",
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  await connectDb();
  const sector = await Sector.findOne({
    key: input.catalogSectorKey,
    active: true,
  }).lean();
  if (!sector) {
    return { ok: false, status: 400, error: "Choose a sector that exists." };
  }
  const workflow = await Workflow.findOne({ key: input.workflowKey });
  if (!workflow) {
    return { ok: false, status: 400, error: "Choose a workflow that exists." };
  }

  const payload = {
    name: input.name,
    summary: input.summary,
    catalogSectorKey: input.catalogSectorKey,
    workflow: workflow._id,
    workflowKey: input.workflowKey,
    active: input.active,
    formSchema: input.formSchema,
    documents: input.documents,
  };

  if (mode === "create") {
    const existing = await ProtocolType.findOne({ key: input.key }).lean();
    if (existing) {
      return { ok: false, status: 409, error: "A service with this key already exists." };
    }
    await ProtocolType.create({ key: input.key, ...payload });
    return { ok: true };
  }

  const updated = await ProtocolType.findOneAndUpdate({ key: input.key }, payload);
  if (!updated) {
    return { ok: false, status: 404, error: "That service was not found." };
  }
  return { ok: true };
}

export async function removeProtocolType(
  key: string,
): Promise<"removed" | "missing" | "in-use"> {
  await connectDb();
  const inUse = await Protocol.countDocuments({ typeKey: key });
  if (inUse > 0) {
    return "in-use";
  }
  const deleted = await ProtocolType.findOneAndDelete({ key });
  return deleted ? "removed" : "missing";
}
