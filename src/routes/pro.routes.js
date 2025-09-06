import { Router } from "express";
import { getFeatured, getAllPro, getProDetails } from "../controllers/pro.controller.js";

const ProRouter = Router();

ProRouter.get("/featured", getFeatured);
ProRouter.get("/getall", getAllPro);
ProRouter.get("/details/:id", getProDetails);

export { ProRouter };
