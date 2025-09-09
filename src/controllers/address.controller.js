import { asyncHandler } from "../utils/asyncHandler.js";
import { Address } from "../models/address.model.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const getAddress = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const address = await Address.findOne({ userId, deletedAt: null });

  return res
    .status(200)
    .json(new ApiResponse(200, address || null, "Address fetched successfully"));

});

const addAddress = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { line1, line2, city, state, postalCode, country } = req.body;

  if (!line1 || !city || !state || !country) {
    throw new ApiError(400, "Please provide all required address fields");
  }

  const existingAddress = await Address.findOne({ userId, deletedAt: null });
  if (existingAddress) {
    throw new ApiError(400, "User already has an address");
  }

  const address = await Address.create({
    userId,
    line1,
    line2,
    city,
    state,
    postalCode,
    country,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, address, "Address added successfully"));
});

const updateAddress = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { line1, line2, city, state, postalCode, country } = req.body;

  const address = await Address.findOne({ userId, deletedAt: null });
  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  address.line1 = line1 ?? address.line1;
  address.line2 = line2 ?? address.line2;
  address.city = city ?? address.city;
  address.state = state ?? address.state;
  address.postalCode = postalCode ?? address.postalCode;
  address.country = country ?? address.country;

  await address.save();

  return res
    .status(200)
    .json(new ApiResponse(200, address, "Address updated successfully"));
});

export { getAddress, addAddress, updateAddress };
