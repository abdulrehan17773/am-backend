import mongoose, { Schema } from "mongoose";

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      min: 0,
      max: 100, // percentage discount (0–100)
      default: 0,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String, default: "" },
      },
    ],

    // 🟢 Product Variants (sizes, colors, stock per variant)
    variants: [
      {
        size: { type: String, required: true },
        color: { type: String, required: true },
        stock: { type: Number, default: 0, min: 0 },
      },
    ],

    // 🔹 total stock auto-updated by pre hook
    totalStock: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// 🔹 Virtual field to calculate final price after discount
productSchema.virtual("finalPrice").get(function () {
  return this.price - (this.price * this.discount) / 100;
});

// 🔹 Pre-save hook to auto calculate total stock
productSchema.pre("save", function (next) {
  if (this.variants && this.variants.length > 0) {
    this.totalStock = this.variants.reduce(
      (sum, v) => sum + (v.stock || 0),
      0
    );
  } else {
    this.totalStock = 0;
  }
  next();
});

export const Product = mongoose.model("Product", productSchema);
