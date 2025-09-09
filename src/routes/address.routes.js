import { Router } from "express";
import { getAddress, addAddress, updateAddress} from "../controllers/address.controller.js";
import { checkAuth } from "../middlewares/checkAuth.middleware.js";

const AddressRouter = Router();

AddressRouter.use(checkAuth);

AddressRouter.get("/get", getAddress);
AddressRouter.post("/add", addAddress); 
AddressRouter.put("/update", updateAddress);

export { AddressRouter };
