import { Schema, model, models, type Model, type Types } from "mongoose";
import { PROTOCOL_STATUSES, type ProtocolStatus } from "@/lib/domain";

export type ProtocolAttachment = {
  requirementKey: string;
  fileName: string;
};

export type ProtocolDocument = {
  code: string;
  type: Types.ObjectId;
  typeKey: string;
  applicant: Types.ObjectId;
  applicantName: string;
  assignee?: Types.ObjectId | null;
  assigneeName?: string | null;
  status: ProtocolStatus;
  currentStageKey: string;
  currentSectorKey: string;
  answers: Record<string, Record<string, string | number | boolean>>;
  attachments: ProtocolAttachment[];
  submittedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const AttachmentSchema = new Schema<ProtocolAttachment>(
  {
    requirementKey: { type: String, required: true },
    fileName: { type: String, required: true },
  },
  { _id: false },
);

const ProtocolSchema = new Schema<ProtocolDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: Schema.Types.ObjectId, ref: "ProtocolType", required: true },
    typeKey: { type: String, required: true, index: true },
    applicant: { type: Schema.Types.ObjectId, ref: "User", required: true },
    applicantName: { type: String, required: true },
    assignee: { type: Schema.Types.ObjectId, ref: "User" },
    assigneeName: { type: String },
    status: { type: String, required: true, enum: PROTOCOL_STATUSES, index: true },
    currentStageKey: { type: String, required: true },
    currentSectorKey: { type: String, required: true, index: true },
    answers: { type: Schema.Types.Mixed, required: true, default: {} },
    attachments: { type: [AttachmentSchema], required: true, default: [] },
    submittedAt: { type: Date },
  },
  { timestamps: true, collection: "protocols" },
);

export const Protocol: Model<ProtocolDocument> =
  (models.Protocol as Model<ProtocolDocument> | undefined) ??
  model<ProtocolDocument>("Protocol", ProtocolSchema);
