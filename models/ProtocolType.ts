import { Schema, model, models, type Model, type Types } from "mongoose";
import { FIELD_KINDS, type DocumentRequirement, type FormSchema } from "@/lib/domain";

export type ProtocolTypeDocument = {
  key: string;
  name: string;
  summary: string;
  catalogSectorKey: string;
  workflow: Types.ObjectId;
  workflowKey: string;
  formSchema: FormSchema;
  documents: DocumentRequirement[];
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

const FieldSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    kind: { type: String, required: true, enum: FIELD_KINDS },
    required: { type: Boolean, required: true },
    help: { type: String },
    options: { type: [String] },
  },
  { _id: false },
);

const SectionSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    fields: { type: [FieldSchema], required: true },
  },
  { _id: false },
);

const DocumentSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    detail: { type: String, required: true },
    required: { type: Boolean, required: true },
  },
  { _id: false },
);

const ProtocolTypeSchema = new Schema<ProtocolTypeDocument>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    summary: { type: String, required: true },
    catalogSectorKey: { type: String, required: true },
    workflow: { type: Schema.Types.ObjectId, ref: "Workflow", required: true },
    workflowKey: { type: String, required: true },
    formSchema: {
      sections: { type: [SectionSchema], required: true },
    },
    documents: { type: [DocumentSchema], required: true },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, collection: "protocol_types" },
);

export const ProtocolType: Model<ProtocolTypeDocument> =
  (models.ProtocolType as Model<ProtocolTypeDocument> | undefined) ??
  model<ProtocolTypeDocument>("ProtocolType", ProtocolTypeSchema);
