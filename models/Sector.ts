import { Schema, model, models, type Model } from "mongoose";

export type SectorDocument = {
  key: string;
  name: string;
  summary: string;
  order: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

const SectorSchema = new Schema<SectorDocument>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    summary: { type: String, required: true },
    order: { type: Number, required: true },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, collection: "sectors" },
);

export const Sector: Model<SectorDocument> =
  (models.Sector as Model<SectorDocument> | undefined) ??
  model<SectorDocument>("Sector", SectorSchema);
