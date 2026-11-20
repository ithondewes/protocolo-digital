import { Schema, model, models, type Model, type Types } from "mongoose";

export type SessionDocument = {
  tokenHash: string;
  user: Types.ObjectId;
  expiresAt: Date;
  createdAt?: Date;
};

const SessionSchema = new Schema<SessionDocument>(
  {
    tokenHash: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "sessions" },
);

export const Session: Model<SessionDocument> =
  (models.Session as Model<SessionDocument> | undefined) ??
  model<SessionDocument>("Session", SessionSchema);
