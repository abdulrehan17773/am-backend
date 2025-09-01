import { Router } from "express";
import { getAllCat } from "../controllers/cat.controller.js";
import {checkAuth} from "../middlewares/checkAuth.middleware.js"

const CatRouter = Router();

CatRouter.use(checkAuth);
CatRouter.get("/getall", getAllCat);

export { CatRouter };  
