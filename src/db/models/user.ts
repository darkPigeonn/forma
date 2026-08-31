import { Schema, models, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    photoURL: { type: String },
    onboardingCompletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: Schema.Types.ObjectId;
};

export const User = models.User || model("User", userSchema);
