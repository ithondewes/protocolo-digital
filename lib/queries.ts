import { connection } from "next/server";
import { Protocol } from "@/models/Protocol";
import type { ProtocolDocument } from "@/models/Protocol";
import { ProtocolType } from "@/models/ProtocolType";
import type { ProtocolTypeDocument } from "@/models/ProtocolType";
import { Sector } from "@/models/Sector";
import type { SectorDocument } from "@/models/Sector";
import { TimelineEvent } from "@/models/TimelineEvent";
import type { TimelineEventDocument } from "@/models/TimelineEvent";
import { Workflow } from "@/models/Workflow";
import type { WorkflowDocument } from "@/models/Workflow";
import type { FormField, ProtocolStatus, TimelineKind } from "./domain";
import { connectDb } from "./db";
import { visitedStages } from "./protocol-flow";

type Stored<T> = T & { _id: { toString(): string } };

export type SectorSummary = {
  key: string;
  name: string;
  summary: string;
  atDesk: number;
  serviceCount: number;
};

export type ServiceView = {
  key: string;
  name: string;
  summary: string;
  publishedBy: string;
  sections: {
    key: string;
    title: string;
    description?: string;
    fields: string;
  }[];
  documents: { label: string; detail: string; required: boolean }[];
  stages: { key: string; sectorName: string }[];
};

export type ProtocolRow = {
  code: string;
  status: ProtocolStatus;
  serviceName: string;
  applicantName: string;
  currentSectorName: string;
  activityAt: string;
};

export type LandingData = {
  sectors: SectorSummary[];
  services: ServiceView[];
  featured: ServiceView | null;
  recent: ProtocolRow[];
};

export type SectorPageData = {
  sector: { key: string; name: string; summary: string };
  services: ServiceView[];
  atDesk: ProtocolRow[];
  movedOn: ProtocolRow[];
};

export type PublicProtocol = {
  code: string;
  status: ProtocolStatus;
  serviceName: string;
  serviceSummary: string;
  currentSectorName: string;
  currentStageKey: string;
  stages: { key: string; sectorName: string }[];
  isDraft: boolean;
  timeline: {
    id: string;
    kind: TimelineKind;
    title: string;
    detail: string;
    at: string;
    sectorName: string;
  }[];
};

type Bundle = {
  sectors: Stored<SectorDocument>[];
  workflows: Stored<WorkflowDocument>[];
  types: Stored<ProtocolTypeDocument>[];
  protocols: Stored<ProtocolDocument>[];
  events: Stored<TimelineEventDocument>[];
};

export function normalizeProtocolCode(code: string): string {
  return code.trim().toUpperCase();
}

async function loadBundle(): Promise<Bundle> {
  await connection();
  await connectDb();

  const [sectors, workflows, types, protocols, events] = await Promise.all([
    Sector.find({ active: true }).sort({ order: 1 }).lean(),
    Workflow.find().lean(),
    ProtocolType.find({ active: true }).lean(),
    Protocol.find().lean(),
    TimelineEvent.find().sort({ at: 1 }).lean(),
  ]);

  if (sectors.length === 0) {
    throw new Error("MongoDB has no sectors yet. Run npm run seed.");
  }

  return {
    sectors: sectors as Stored<SectorDocument>[],
    workflows: workflows as Stored<WorkflowDocument>[],
    types: types as Stored<ProtocolTypeDocument>[],
    protocols: protocols as Stored<ProtocolDocument>[],
    events: events as Stored<TimelineEventDocument>[],
  };
}

export async function getLandingData(): Promise<LandingData> {
  const bundle = await loadBundle();
  const services = servicesFrom(bundle);
  const rows = protocolRows(bundle);
  const featured = services.reduce<ServiceView | null>((longest, service) => {
    if (!longest || service.stages.length > longest.stages.length) {
      return service;
    }
    return longest;
  }, null);

  return {
    sectors: bundle.sectors.map((sector) => ({
      key: sector.key,
      name: sector.name,
      summary: sector.summary,
      atDesk: bundle.protocols.filter(
        (protocol) => protocol.currentSectorKey === sector.key,
      ).length,
      serviceCount: services.filter((service) =>
        service.stages.some((stage) => stage.sectorName === sector.name),
      ).length,
    })),
    services,
    featured,
    recent: rows
      .filter((row) => row.status !== "draft")
      .sort((left, right) => right.activityAt.localeCompare(left.activityAt))
      .slice(0, 5),
  };
}

export async function getSectorPage(slug: string): Promise<SectorPageData | null> {
  const bundle = await loadBundle();
  const sector = bundle.sectors.find((item) => item.key === slug.toLowerCase());
  if (!sector) {
    return null;
  }

  const services = servicesFrom(bundle).filter((service) =>
    service.stages.some((stage) => stage.sectorName === sector.name),
  );
  const sectorNames = new Map(bundle.sectors.map((item) => [item.key, item.name]));
  const workflows = new Map(bundle.workflows.map((workflow) => [workflow.key, workflow]));
  const types = new Map(bundle.types.map((type) => [type.key, type]));
  const activity = activityByProtocol(bundle.events);

  const atDesk: ProtocolRow[] = [];
  const movedOn: ProtocolRow[] = [];

  for (const protocol of bundle.protocols) {
    const type = types.get(protocol.typeKey);
    const workflow = type ? workflows.get(type.workflowKey) : undefined;
    if (!type || !workflow) {
      continue;
    }
    const row = toRow(protocol, type.name, sectorNames, activity);
    if (protocol.currentSectorKey === sector.key) {
      atDesk.push(row);
      continue;
    }
    const seen = visitedStages(workflow.stages, protocol.currentStageKey).some(
      (stage) => stage.sectorKey === sector.key,
    );
    if (seen && protocol.status !== "draft") {
      movedOn.push(row);
    }
  }

  const byActivity = (left: ProtocolRow, right: ProtocolRow) =>
    right.activityAt.localeCompare(left.activityAt);

  return {
    sector: { key: sector.key, name: sector.name, summary: sector.summary },
    services,
    atDesk: atDesk.sort(byActivity),
    movedOn: movedOn.sort(byActivity),
  };
}

export async function getPublicProtocol(code: string): Promise<PublicProtocol | null> {
  const normalized = normalizeProtocolCode(code);
  if (!/^VC-\d{4}-\d{4}$/.test(normalized)) {
    return null;
  }

  const bundle = await loadBundle();
  const protocol = bundle.protocols.find((item) => item.code === normalized);
  if (!protocol) {
    return null;
  }

  const type = bundle.types.find((item) => item.key === protocol.typeKey);
  const workflow = bundle.workflows.find((item) => item.key === type?.workflowKey);
  if (!type || !workflow) {
    return null;
  }

  const sectorNames = new Map(bundle.sectors.map((sector) => [sector.key, sector.name]));
  const protocolId = protocol._id.toString();

  return {
    code: protocol.code,
    status: protocol.status,
    serviceName: type.name,
    serviceSummary: type.summary,
    currentSectorName:
      sectorNames.get(protocol.currentSectorKey) ?? protocol.currentSectorKey,
    currentStageKey: protocol.currentStageKey,
    stages: [...workflow.stages]
      .sort((left, right) => left.order - right.order)
      .map((stage) => ({
        key: stage.key,
        sectorName: sectorNames.get(stage.sectorKey) ?? stage.sectorKey,
      })),
    isDraft: protocol.status === "draft",
    timeline: bundle.events
      .filter(
        (event) =>
          protocol.status !== "draft" &&
          event.protocol.toString() === protocolId &&
          event.visibility === "public",
      )
      .map((event) => ({
        id: event._id.toString(),
        kind: event.kind,
        title: event.title,
        detail: event.detail,
        at: event.at.toISOString(),
        sectorName: sectorNames.get(event.sectorKey) ?? event.sectorKey,
      })),
  };
}

function servicesFrom(bundle: Bundle): ServiceView[] {
  const sectorNames = new Map(bundle.sectors.map((sector) => [sector.key, sector.name]));
  const workflows = new Map(bundle.workflows.map((workflow) => [workflow.key, workflow]));

  return bundle.types
    .flatMap((type) => {
      const workflow = workflows.get(type.workflowKey);
      if (!workflow) {
        return [];
      }
      return [
        {
          key: type.key,
          name: type.name,
          summary: type.summary,
          publishedBy: sectorNames.get(type.catalogSectorKey) ?? type.catalogSectorKey,
          sections: type.formSchema.sections.map((section) => ({
            key: section.key,
            title: section.title,
            description: section.description,
            fields: section.fields.map(describeField).join(", "),
          })),
          documents: type.documents.map((document) => ({
            label: document.label,
            detail: document.detail,
            required: document.required,
          })),
          stages: [...workflow.stages]
            .sort((left, right) => left.order - right.order)
            .map((stage) => ({
              key: stage.key,
              sectorName: sectorNames.get(stage.sectorKey) ?? stage.sectorKey,
            })),
        },
      ];
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function protocolRows(bundle: Bundle): ProtocolRow[] {
  const sectorNames = new Map(bundle.sectors.map((sector) => [sector.key, sector.name]));
  const typeNames = new Map(bundle.types.map((type) => [type.key, type.name]));
  const activity = activityByProtocol(bundle.events);
  return bundle.protocols.flatMap((protocol) => {
    const serviceName = typeNames.get(protocol.typeKey);
    if (!serviceName) {
      return [];
    }
    return [toRow(protocol, serviceName, sectorNames, activity)];
  });
}

function toRow(
  protocol: Stored<ProtocolDocument>,
  serviceName: string,
  sectorNames: Map<string, string>,
  activity: Map<string, string>,
): ProtocolRow {
  return {
    code: protocol.code,
    status: protocol.status,
    serviceName,
    applicantName: protocol.applicantName,
    currentSectorName:
      sectorNames.get(protocol.currentSectorKey) ?? protocol.currentSectorKey,
    activityAt:
      activity.get(protocol._id.toString()) ??
      protocol.updatedAt?.toISOString() ??
      new Date(0).toISOString(),
  };
}

function activityByProtocol(
  events: Stored<TimelineEventDocument>[],
): Map<string, string> {
  const latest = new Map<string, number>();
  for (const event of events) {
    if (event.visibility !== "public") {
      continue;
    }
    const id = event.protocol.toString();
    const time = event.at.getTime();
    const previous = latest.get(id) ?? 0;
    if (time >= previous) {
      latest.set(id, time);
    }
  }
  return new Map(
    [...latest.entries()].map(([id, time]) => [id, new Date(time).toISOString()]),
  );
}

function describeField(field: FormField): string {
  if (field.kind === "select" && field.options && field.options.length > 0) {
    return `${field.label} (${field.options.join(", ")})`;
  }
  return field.label;
}
