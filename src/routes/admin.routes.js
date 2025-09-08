import { Router } from "express";
import { createUserByAdmin, updateUserByAdmin, deleteUserByAdmin, getAllUsersByAdmin } from "../controllers/user.controller.js";
import { createCategoryByAdmin, updateCategoryByAdmin, deleteCategoryByAdmin, getAllCategoriesByAdmin } from "../controllers/cat.controller.js";
import { createProduct, updateProduct, toggleActive, toggleFeatured, updateVariants, addImage, removeImage, deleteProduct, getAllProductsAdmin, getSingleProductAdmin } from "../controllers/pro.controller.js";
import { checkAuth, checkAdmin } from "../middlewares/checkAuth.middleware.js";

const AdminRouter = Router();

AdminRouter.use(checkAuth, checkAdmin);

// 🟢 User routes
AdminRouter.get("/user/getall", getAllUsersByAdmin);
AdminRouter.post("/user/create", createUserByAdmin);
AdminRouter.patch("/user/update/:id", updateUserByAdmin);
AdminRouter.delete("/user/delete/:id", deleteUserByAdmin);

// 🟢 Category routes
AdminRouter.get("/cat/getall", getAllCategoriesByAdmin);
AdminRouter.post("/cat/create", createCategoryByAdmin);
AdminRouter.patch("/cat/update/:id", updateCategoryByAdmin);
AdminRouter.delete("/cat/delete/:id", deleteCategoryByAdmin);

// 🟢 Product routes
AdminRouter.get("/pro/getall", getAllProductsAdmin);
AdminRouter.get("/pro/get/:id", getSingleProductAdmin);
AdminRouter.post("/pro/create", createProduct);
AdminRouter.patch("/pro/update/:id", updateProduct);
AdminRouter.patch("/pro/toggle-active/:id", toggleActive);
AdminRouter.patch("/pro/toggle-featured/:id", toggleFeatured);
AdminRouter.patch("/pro/update-variants/:id", updateVariants);
AdminRouter.post("/pro/add-image/:id", addImage);
AdminRouter.delete("/pro/remove-image/:id", removeImage);
AdminRouter.delete("/pro/delete/:id", deleteProduct);

export { AdminRouter };
