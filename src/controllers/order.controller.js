import { asyncHandler } from "../utils/asyncHandler.js";
import { Cart } from "../models/cart.model.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/pro.model.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const placeOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { address, deliveryFee = 0 } = req.body;

  // 1️⃣ Get all active cart items
  const cartItems = await Cart.find({ userId, deletedAt: null }).populate("productId");
  if (!cartItems || cartItems.length === 0) {
    throw new ApiError(400, "Your cart is empty");
  }

  // 2️⃣ Build product snapshots
  let subtotal = 0;
  const products = [];

  for (const item of cartItems) {
    const product = item.productId; // already populated
    if (!product) throw new ApiError(404, "Product not found");

    const priceSnapshot = product.finalPrice || product.price;

    products.push({
      productId: product._id,
      variant: { size: item.variant.size, color: item.variant.color },
      qty: item.qty,
      price: priceSnapshot,
    });

    subtotal += priceSnapshot * item.qty;
  }

  // 3️⃣ Create new order
  const order = await Order.create({
    userId,
    products,
    subtotal,
    deliveryFee,
    totalAmount: subtotal + deliveryFee,
    address,
  });

  // 4️⃣ Soft delete cart items
  await Cart.updateMany(
    { userId, deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );

  return res
    .status(201)
    .json(new ApiResponse(201, order, "Order placed successfully"));
});

const cancelOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { orderId } = req.params; // route param is ":orderId"

  // 1️⃣ Find order belonging to this user
  const order = await Order.findOne({ orderId, userId, deletedAt: null });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // 2️⃣ Allow cancel only if status is pending or preparing
  if (!["pending", "preparing"].includes(order.status)) {
    throw new ApiError(
      400,
      `Order cannot be cancelled, current status: ${order.status}`
    );
  }

  // 3️⃣ Set status to cancelled
  order.status = "cancelled";
  await order.save();

  // 4️⃣ Return response
  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order cancelled successfully"));
});

const getAllOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 10, status, search } = req.query;

  const query = { userId, deletedAt: null };

  // 🔍 Search by orderId
  if (search) {
    query.orderId = { $regex: search, $options: "i" };
  }

  // 🟢 Filter by status
  if (status) {
    query.status = status;
  }

  // 📊 Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    Order.find(query, "orderId createdAt status totalAmount paymentStatus")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Order.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    }, "Orders fetched successfully")
  );
});

const getOrderDetails = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { orderId } = req.params; // route param is ":orderId"

  // 🔍 Find order by orderId (belonging to this user)
  const order = await Order.findOne({ orderId, userId, deletedAt: null })
    .populate({
      path: "products.productId",
      select: "name images",
    });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // 🖼️ Format product data (first image only)
  const orderData = order.toObject();
  orderData.products = orderData.products.map((item) => ({
    ...item,
    productName: item.productId?.name || "",
    productImage: item.productId?.images?.[0]?.url || null,
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, orderData, "Order details fetched successfully"));
});

const getAllOrdersByAdmin = asyncHandler(async (req, res) => {
 
});

const getOrderDetailsByAdmin = asyncHandler(async (req, res) => {
 
});

const rejectOrder = asyncHandler(async (req, res) => {
 
});

const updatePayment = asyncHandler(async (req, res) => {
 
});

const updateStatus = asyncHandler(async (req, res) => {
 
});

export { placeOrder, cancelOrder, getAllOrders, getOrderDetails, getAllOrdersByAdmin, getOrderDetailsByAdmin, rejectOrder, updatePayment, updateStatus };
