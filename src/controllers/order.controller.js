import { asyncHandler } from "../utils/asyncHandler.js";
import { Cart } from "../models/cart.model.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/pro.model.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const placeOrder = asyncHandler(async (req, res) => {
 
});

const cancelOrder = asyncHandler(async (req, res) => {
 
});

const getAllOrders = asyncHandler(async (req, res) => {
 
});

const getOrderDetails = asyncHandler(async (req, res) => {
 
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
