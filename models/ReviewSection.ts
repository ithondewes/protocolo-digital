import { Schema, model, models, type Model, type Types } from "mongoose";
import { REVIEW_DECISIONS, type ReviewDecision } from "@/lib/domain";
import { ReviewNoteSchema, type ReviewNote } from "./ReviewNote";

/**
 * One catalog section of a protocol, reviewed at a single workflow stage.
 * The section key comes from the protocol type's form schema.
 */
export type ReviewSectionDocument = {
  protocol: Types.ObjectId;
  stageKey: string;
  sectionKey: string;
  decision: ReviewDecision;
  notes: ReviewNote[];
  createdAt?: Date;
  updatedAt?: Date;
};

const ReviewSectionSchema = new Schema<ReviewSectionDocument>(
  {
    protocol: {
      type: Schema.Types.ObjectId,
      ref: "Protocol",
      required: true,
      index: true,
    },
    stageKey: { type: String, required: true },
    sectionKey: { type: String, required: true },
    decision: { type: String, required: true, enum: REVIEW_DECISIONS },
    notes: { type: [ReviewNoteSchema], required: true, default: [] },
  },
  { timestamps: true, collection: "review_sections" },
);

ReviewSectionSchema.index({ protocol: 1, stageKey: 1, sectionKey: 1 }, { unique: true });

export const ReviewSection: Model<ReviewSectionDocument> =
  (models.ReviewSection as Model<ReviewSectionDocument> | undefined) ??
  model<ReviewSectionDocument>("ReviewSection", ReviewSectionSchema);
