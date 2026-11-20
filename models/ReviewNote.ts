import { Schema, type Types } from "mongoose";

/**
 * A note an analyst writes while reviewing one section.
 * Notes live on the review section document; they are not a separate collection.
 */
export type ReviewNote = {
  author: Types.ObjectId;
  body: string;
  createdAt: Date;
};

export const ReviewNoteSchema = new Schema<ReviewNote>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, maxlength: 2000 },
    createdAt: { type: Date, required: true },
  },
  { _id: true },
);
