import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  TIMELINE_KINDS,
  TIMELINE_VISIBILITY,
  type TimelineKind,
  type TimelineVisibility,
} from "@/lib/domain";

export type TimelineEventDocument = {
  protocol: Types.ObjectId;
  kind: TimelineKind;
  title: string;
  detail: string;
  sectorKey: string;
  at: Date;
  visibility: TimelineVisibility;
};

const TimelineEventSchema = new Schema<TimelineEventDocument>(
  {
    protocol: {
      type: Schema.Types.ObjectId,
      ref: "Protocol",
      required: true,
      index: true,
    },
    kind: { type: String, required: true, enum: TIMELINE_KINDS },
    title: { type: String, required: true },
    detail: { type: String, required: true },
    sectorKey: { type: String, required: true },
    at: { type: Date, required: true },
    visibility: {
      type: String,
      required: true,
      enum: TIMELINE_VISIBILITY,
      default: "public",
    },
  },
  { collection: "timeline_events" },
);

export const TimelineEvent: Model<TimelineEventDocument> =
  (models.TimelineEvent as Model<TimelineEventDocument> | undefined) ??
  model<TimelineEventDocument>("TimelineEvent", TimelineEventSchema);
