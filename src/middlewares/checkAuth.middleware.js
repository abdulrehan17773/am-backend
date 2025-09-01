import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 🔹 Check if already logged in (for login route)
const checkLogin = asyncHandler(async (req, _, next) => {
  const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
  
  if (token) {
    throw new ApiError(401, "User already logged in");
  }

  next();
});

// 🔹 Authenticate user with Access Token
const checkAuth = asyncHandler(async (req, _, next) => {
  const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized: No token provided");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_STRING);
  } catch (err) {
    throw new ApiError(401, "Unauthorized: Invalid or expired token");
  }

  const user = await User.findOne({ uid: decoded.uid }).select(
    "-password -refreshTokens -__v -createdAt -updatedAt -deletedAt -otp -otp_time"
  );

  if (!user) {
    throw new ApiError(401, "Unauthorized: User not found");
  }

  req.user = user; // attach user to req
  next();
});

// 🔹 Check if user is admin
const checkAdmin = asyncHandler(async (req, _, next) => {
  if (!req.user || req.user.role !== "Admin") {
    throw new ApiError(403, "Access denied: Admins only");
  }
  next();
});

export { checkAuth, checkAdmin, checkLogin };
