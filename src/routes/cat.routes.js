import { Router } from "express";
import { getAllCat } from "../controllers/cat.controller.js";

const CatRouter = Router();

CatRouter.get("/getall", getAllCat);

export { CatRouter };  
