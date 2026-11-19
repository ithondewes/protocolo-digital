import mongoose from "mongoose";
import { connectDb } from "../lib/db";
import { Protocol } from "../models/Protocol";
import { ProtocolType } from "../models/ProtocolType";
import { ReviewSection } from "../models/ReviewSection";
import { Sector } from "../models/Sector";
import { TimelineEvent } from "../models/TimelineEvent";
import { User } from "../models/User";
import { Workflow } from "../models/Workflow";
import { assertCatalog, catalog } from "./catalog";

async function main(): Promise<void> {
  assertCatalog(catalog);
  await connectDb();

  await Promise.all([
    Sector.deleteMany({}),
    User.deleteMany({}),
    Workflow.deleteMany({}),
    ProtocolType.deleteMany({}),
    Protocol.deleteMany({}),
    ReviewSection.deleteMany({}),
    TimelineEvent.deleteMany({}),
  ]);

  const sectorDocs = await Sector.insertMany(
    catalog.sectors.map((sector) => ({ ...sector, active: true })),
  );
  const sectorId = new Map(sectorDocs.map((sector) => [sector.key, sector._id]));

  const userDocs = await User.insertMany(catalog.users);
  const userId = new Map(userDocs.map((user) => [user.email, user._id]));
  const userName = new Map(userDocs.map((user) => [user.email, user.name]));

  const workflowDocs = await Workflow.insertMany(
    catalog.workflows.map((workflow) => ({
      key: workflow.key,
      name: workflow.name,
      summary: workflow.summary,
      stages: workflow.stages.map((stage) => ({
        key: stage.key,
        title: stage.title,
        sectorKey: stage.sectorKey,
        order: stage.order,
        sector: sectorId.get(stage.sectorKey),
      })),
    })),
  );
  const workflowId = new Map(
    workflowDocs.map((workflow) => [workflow.key, workflow._id]),
  );

  const typeDocs = await ProtocolType.insertMany(
    catalog.protocolTypes.map((type) => ({
      ...type,
      workflow: workflowId.get(type.workflowKey),
      active: true,
    })),
  );
  const typeId = new Map(typeDocs.map((type) => [type.key, type._id]));

  for (const protocol of catalog.protocols) {
    const filed = protocol.events.find((item) => item.kind === "filed");
    const lastEvent = protocol.events.at(-1);
    const activity = new Date(lastEvent?.at ?? "2026-11-18T12:00:00.000Z");
    const applicant = userId.get(protocol.applicantEmail);
    const type = typeId.get(protocol.typeKey);
    if (!applicant || !type) {
      throw new Error(`Could not resolve links for ${protocol.code}.`);
    }

    const created = await Protocol.create({
      code: protocol.code,
      type,
      typeKey: protocol.typeKey,
      applicant,
      applicantName: userName.get(protocol.applicantEmail),
      assignee: protocol.assigneeEmail ? userId.get(protocol.assigneeEmail) : undefined,
      assigneeName: protocol.assigneeEmail
        ? userName.get(protocol.assigneeEmail)
        : undefined,
      status: protocol.status,
      currentStageKey: protocol.currentStageKey,
      currentSectorKey: protocol.currentSectorKey,
      answers: protocol.answers,
      attachments: protocol.attachments,
      submittedAt: filed ? new Date(filed.at) : undefined,
    });

    await Protocol.updateOne(
      { _id: created._id },
      { $set: { createdAt: activity, updatedAt: activity } },
      { timestamps: false },
    );

    if (protocol.reviews.length > 0) {
      await ReviewSection.insertMany(
        protocol.reviews.map((review) => ({
          protocol: created._id,
          stageKey: review.stageKey,
          sectionKey: review.sectionKey,
          decision: review.decision,
          notes: review.notes.map((note) => ({
            author: userId.get(note.authorEmail),
            body: note.body,
            createdAt: new Date(note.at),
          })),
        })),
      );
    }

    if (protocol.events.length > 0) {
      await TimelineEvent.insertMany(
        protocol.events.map((item) => ({
          protocol: created._id,
          kind: item.kind,
          title: item.title,
          detail: item.detail,
          sectorKey: item.sectorKey,
          at: new Date(item.at),
          visibility: item.visibility,
        })),
      );
    }
  }

  console.log(
    `Seeded ${catalog.protocols.length} fictitious protocols for Vale Claro. Track VC-2026-1077 to see a file that already moved from Meio Ambiente to Obras.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
