import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Includes the owner, so "projects I can access" is a single indexed query.
    members: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], index: true },
  },
  { timestamps: true },
);

export const Project: Model<InferSchemaType<typeof projectSchema>> =
  models.Project ?? model("Project", projectSchema);
