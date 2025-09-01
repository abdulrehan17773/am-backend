import { Router } from "express";
import { createUserByAdmin, updateUserByAdmin, deleteUserByAdmin, getAllUsersByAdmin } from "../controllers/user.controller.js";
import { createCategoryByAdmin, updateCategoryByAdmin, deleteCategoryByAdmin, getAllCategoriesByAdmin } from "../controllers/cat.controller.js";
import {checkAuth, checkAdmin} from "../middlewares/checkAuth.middleware.js"

const AdminRouter = Router();

AdminRouter.use(checkAuth, checkAdmin);
AdminRouter.get("/user/getall", getAllUsersByAdmin);
AdminRouter.post("/user/create", createUserByAdmin);
AdminRouter.patch("/user/update/:id", updateUserByAdmin);
AdminRouter.delete("/user/delete/:id", deleteUserByAdmin);

AdminRouter.get("/cat/getall", getAllCategoriesByAdmin);
AdminRouter.post("/cat/create", createCategoryByAdmin);
AdminRouter.patch("/cat/update/:id", updateCategoryByAdmin);
AdminRouter.delete("/cat/delete/:id", deleteCategoryByAdmin);

export { AdminRouter };  
