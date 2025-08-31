import { Router } from "express";
import {
  Hello,
} from "../controllers/user.controller.js";

const UserRouter = Router();

// Unsecured routes
UserRouter.route("/hello").get(Hello);


export { UserRouter };
