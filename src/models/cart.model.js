import mongoose, { Schema } from "mongoose";

const cartSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant: {
      size: { type: String, required: true },
      color: { type: String, required: true },
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ✅ Ensure one unique cart item per (userId + productId + variant)
cartSchema.index(
  { userId: 1, productId: 1, "variant.size": 1, "variant.color": 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

export const Cart = mongoose.model("Cart", cartSchema);
