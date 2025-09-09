import { Router } from "express";
import { placeOrder, cancelOrder, getAllOrders, getOrderDetails } from "../controllers/order.controller.js";
import { checkAuth } from "../middlewares/checkAuth.middleware.js";

const OrderRouter = Router();

OrderRouter.use(checkAuth);

OrderRouter.post("/place", placeOrder);
OrderRouter.put("/cancel/:orderId", cancelOrder);
OrderRouter.get("/getall", getAllOrders);
OrderRouter.get("/order/:orderId", getOrderDetails);

export { OrderRouter };  
