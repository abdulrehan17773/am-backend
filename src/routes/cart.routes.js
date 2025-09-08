import { Router } from "express";
import { addToCart, getCart, updateCartQty, removeCartItem, clearCart } from "../controllers/cart.controller.js";
import { checkAuth } from "../middlewares/checkAuth.middleware.js";

const CartRouter = Router();

CartRouter.use(checkAuth);

CartRouter.get("/getall", getCart);
CartRouter.post("/add", addToCart); 
CartRouter.put("/update/:id", updateCartQty); 
CartRouter.delete("/remove/:id", removeCartItem); 
CartRouter.delete("/clear", clearCart); 

export { CartRouter };
