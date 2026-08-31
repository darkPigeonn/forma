import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

const formCollaboratorSchema = new Schema(
  {
    formId: {
      type: Schema.Types.ObjectId,
      ref: "Form",
      required: true,
      index: true,
    },
    email: { type: String, required: true, trim: true, lowercase: true },
    userId: { type: String, default: null, index: true },
    role: { type: String, enum: ["editor"], default: "editor", required: true },
    status: {
      type: String,
      enum: ["pending", "active"],
      default: "pending",
      required: true,
    },
    inviteToken: { type: String, required: true, unique: true, index: true },
    invitedBy: { type: String, required: true },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

formCollaboratorSchema.index({ formId: 1, email: 1 }, { unique: true });
formCollaboratorSchema.index({ userId: 1, status: 1 });

export type FormCollaboratorDocument = InferSchemaType<
  typeof formCollaboratorSchema
> & {
  _id: Types.ObjectId;
  formId: Types.ObjectId;
};

export const FormCollaborator =
  models.FormCollaborator ||
  model("FormCollaborator", formCollaboratorSchema);
