import { Schema, model, models, type Model, type Types } from "mongoose";

export type WorkflowStage = {
  key: string;
  title: string;
  sector: Types.ObjectId;
  sectorKey: string;
  order: number;
};

export type WorkflowDocument = {
  key: string;
  name: string;
  summary: string;
  stages: WorkflowStage[];
  createdAt?: Date;
  updatedAt?: Date;
};

const StageSchema = new Schema<WorkflowStage>(
  {
    key: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    sector: { type: Schema.Types.ObjectId, ref: "Sector", required: true },
    sectorKey: { type: String, required: true },
    order: { type: Number, required: true },
  },
  { _id: false },
);

const WorkflowSchema = new Schema<WorkflowDocument>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    summary: { type: String, required: true },
    stages: { type: [StageSchema], required: true },
  },
  { timestamps: true, collection: "workflows" },
);

export const Workflow: Model<WorkflowDocument> =
  (models.Workflow as Model<WorkflowDocument> | undefined) ??
  model<WorkflowDocument>("Workflow", WorkflowSchema);
