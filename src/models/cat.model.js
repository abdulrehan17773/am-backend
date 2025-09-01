import mongoose, { Schema } from "mongoose";

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true, // categories should not repeat
    },
    deletedAt: {
      type: Date,
      default: null, // soft delete
    },
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", categorySchema);
