import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";

const userSchema = new Schema(
  {
    uid: {
      type: String,
      unique: true,
      index: true,
      required: true,
      default: () => nanoid(12),
    },
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    avatar: {
      type: String,
      default:
        "https://res.cloudinary.com/dfnyh1dnu/image/upload/v1738077224/logo_ghgifr.webp",
    },
    verify: {
      type: Boolean,
      default: false,
    },
    otp: Number,
    otp_time: Number,
    role: {
      type: String,
      enum: ["User", "Admin", "Support"],
      default: "User",
    },
    refreshTokens: [
      {
        token: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    currency: {
      type: String,
      enum: ["USD", "GBP", "EUR", "PKR"],
      default: "USD",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// 🔹 Password hash
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isNew) {
    this.otp = Math.floor(100000 + Math.random() * 900000);
    this.otp_time = Date.now() + 15 * 60 * 1000; // 15 mins
  }
  next();
});

// 🔹 Compare password
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

// 🔹 Generate OTP
userSchema.methods.defineOtp = function () {
  return {
    otp: Math.floor(100000 + Math.random() * 900000),
    otp_time: Date.now() + 15 * 60 * 1000,
  };
};

// 🔹 Generate Access Token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, uid: this.uid, email: this.email, role: this.role },
    process.env.ACCESS_TOKEN_STRING,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

// 🔹 Generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
  const token = jwt.sign(
    { uid: this.uid },
    process.env.REFRESH_TOKEN_STRING,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
  return token;
};

export const User = mongoose.model("User", userSchema);
