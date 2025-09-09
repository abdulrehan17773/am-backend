import mongoose, { Schema } from "mongoose";

const addressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String },
    country: { type: String, required: true },
    deletedAt: { type: Date, default: null }, 
  },
  { timestamps: true }
);

export const Address = mongoose.model("Address", addressSchema);
