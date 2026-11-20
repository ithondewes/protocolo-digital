import { Schema, model, models, type Model } from "mongoose";
import { USER_ROLES, type UserRole } from "@/lib/domain";

export type UserDocument = {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  sectorKeys: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: USER_ROLES },
    sectorKeys: { type: [String], required: true, default: [] },
  },
  { timestamps: true, collection: "users" },
);

export const User: Model<UserDocument> =
  (models.User as Model<UserDocument> | undefined) ??
  model<UserDocument>("User", UserSchema);
