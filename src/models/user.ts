import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

const userSchema = new Schema(
  {
    clerkId: { type: String, required: true, unique: true },
    email: { type: String, default: "", lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: null },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };

export const User: Model<InferSchemaType<typeof userSchema>> =
  models.User ?? model("User", userSchema);
