import { Router } from "express";
import { createUserByAdmin, updateUserByAdmin, deleteUserByAdmin, getAllUsersByAdmin } from "../controllers/user.controller.js";
import {checkAuth, checkAdmin} from "../middlewares/checkAuth.middleware.js"

const AdminRouter = Router();

UserRouter.use(checkAuth, checkAdmin);
AdminRouter.get("/getall", getAllUsersByAdmin);
AdminRouter.post("/create", createUserByAdmin);
AdminRouter.patch("/update/:id", updateUserByAdmin);
AdminRouter.delete("/delete/:id", deleteUserByAdmin);

export { AdminRouter };  
