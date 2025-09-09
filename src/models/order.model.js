import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const orderSchema = new Schema(
  {
    orderId: { 
      type: String, 
      unique: true, // will be auto-generated 
    },
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      index: true, 
    },
    products: [
      {
        productId: { 
          type: Schema.Types.ObjectId, 
          ref: "Product", 
          required: true, 
        },
        variant: {
          size: { type: String, required: true },
          color: { type: String, required: true },
        },
        qty: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true }, // snapshot of product price at order time
      },
    ],
    subtotal: { 
      type: Number, 
      required: true, // total of products only
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 0, // can be dynamic based on location
    },
    totalAmount: { 
      type: Number, 
      required: true, // subtotal + deliveryFee
    },
    status: {
      type: String,
      enum: ["pending", "preparing", "rejected", "cancelled", "shipped", "delivered", "refunded"],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "bank", "paypal", "cash", "other"],
      default: "cash",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    rejectReason: { 
      type: String, // for rejected orders 
    },
    address: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String },
      country: { type: String, required: true },
    },
    deletedAt: { 
      type: Date, 
      default: null, 
    },
  },
  { timestamps: true }
);

// 🔹 Pre-save hook to auto-generate orderId if not present
orderSchema.pre("save", function (next) {
  if (!this.orderId) {
    this.orderId = "ORD-" + uuidv4();
  }
  next();
});

export const Order = mongoose.model("Order", orderSchema);
