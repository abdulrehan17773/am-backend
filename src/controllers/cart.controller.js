import { asyncHandler } from "../utils/asyncHandler.js";
import { Product } from "../models/pro.model.js";
import { Cart } from "../models/cart.model.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";


const addToCart = asyncHandler(async (req, res) => {
  const { productId, variant, qty } = req.body;
  const userId = req.user?._id;

  if (!productId || !variant?.size || !variant?.color || !qty) {
    throw new ApiError(400, "Product ID, variant, and quantity are required");
  }

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new ApiError(404, "Product not found");

  // check if variant exists
  const selectedVariant = product.variants.find(
    (v) => v.size === variant.size && v.color === variant.color
  );
  if (!selectedVariant) {
    throw new ApiError(400, "Invalid product variant");
  }

  // check stock
  if (selectedVariant.stock < qty) {
    throw new ApiError(400, "Not enough stock for this variant");
  }

  // check if already in cart
  let cartItem = await Cart.findOne({
    userId,
    productId,
    "variant.size": variant.size,
    "variant.color": variant.color,
    deletedAt: null,
  });

  if (cartItem) {
    cartItem.qty += qty;
    if (cartItem.qty > selectedVariant.stock) {
      throw new ApiError(400, "Exceeds available stock");
    }
    await cartItem.save();
  } else {
    cartItem = await Cart.create({ userId, productId, variant, qty });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, cartItem, "Product added to cart"));
});

const getCart = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  // fetch all active cart rows
  const cartItems = await Cart.find({ userId, deletedAt: null }).populate(
    "productId",
    "name price discount finalPrice images variants isActive deletedAt"
  );

  const validItems = [];

  for (const item of cartItems) {
    const product = item.productId;

    // ❌ Product missing, inactive, or soft-deleted → remove
    if (!product || !product.isActive || product.deletedAt) {
      item.deletedAt = new Date();
      await item.save();
      continue;
    }

    // ❌ Variant not available → remove
    const selectedVariant = product.variants.find(
      (v) => v.size === item.variant.size && v.color === item.variant.color
    );
    if (!selectedVariant || selectedVariant.stock <= 0) {
      item.deletedAt = new Date();
      await item.save();
      continue;
    }

    // ✅ Item is valid
    validItems.push(item);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, validItems, "Cart fetched successfully"));
});

const updateCartQty = asyncHandler(async (req, res) => {
  const cartItemId = req.params.id;
  const { qty } = req.body;
  const userId = req.user?._id;

  if (!qty && qty !== 0) {
    throw new ApiError(400, "Quantity is required");
  }

  // find cart row with product check
  const cartItem = await Cart.findOne({
    _id: cartItemId,
    userId,
    deletedAt: null,
  }).populate({
    path: "productId",
    select: "variants isActive deletedAt",
    match: { deletedAt: null, isActive: true },
  });

  if (!cartItem) throw new ApiError(404, "Cart item not found");

  const product = cartItem.productId;

  // product check
  if (!product) {
    cartItem.deletedAt = new Date();
    await cartItem.save();
    throw new ApiError(404, "Product no longer available, removed from cart");
  }

  // variant check
  const selectedVariant = product.variants.find(
    (v) =>
      v.size === cartItem.variant.size && v.color === cartItem.variant.color
  );

  if (!selectedVariant) {
    cartItem.deletedAt = new Date();
    await cartItem.save();
    throw new ApiError(404, "Product variant not available, removed from cart");
  }

  // stock check
  if (selectedVariant.stock <= 0) {
    cartItem.deletedAt = new Date();
    await cartItem.save();
    throw new ApiError(400, "Product out of stock, removed from cart");
  }

  if (qty <= 0) {
    cartItem.deletedAt = new Date(); // soft delete if qty <= 0
  } else {
    if (qty > selectedVariant.stock) {
      throw new ApiError(
        400,
        `Only ${selectedVariant.stock} item(s) available for this variant`
      );
    }
    cartItem.qty = qty;
  }

  await cartItem.save();

  return res
    .status(200)
    .json(new ApiResponse(200, cartItem, "Cart item updated"));
});

const removeCartItem = asyncHandler(async (req, res) => {
  const cartItemId = req.params.id;
const userId = req.user?._id;

const cartItem = await Cart.findOne({ _id: cartItemId, userId, deletedAt: null });
if (!cartItem) throw new ApiError(404, "Cart item not found");

cartItem.deletedAt = new Date();
await cartItem.save();

return res
  .status(200)
  .json(new ApiResponse(200, null, "Cart item removed"));
});

const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  await Cart.updateMany(
    { userId, deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Cart cleared successfully"));
});

export { addToCart, getCart, updateCartQty, removeCartItem, clearCart };
