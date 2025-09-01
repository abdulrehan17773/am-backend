import { Router } from "express";
import { registerUser, loginUser, logout, tokenUpdate, currentUser, verifyUser, resendOtp, updateProfile, updateAvatar, updateCurrency, updatePassword, forgetPassword, sendForgetPassword, checkExpiryForget } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import {checkLogin, checkAuth} from "../middlewares/checkAuth.middleware.js"

const UserRouter = Router();

// // unsecure routes
UserRouter.route("/register").post(registerUser);
UserRouter.route("/login").post(checkLogin, loginUser);
UserRouter.route("/refresh-token").post(tokenUpdate);
UserRouter.route("/verification").post(verifyUser);
UserRouter.route("/resend-otp").post(resendOtp);
UserRouter.route("/send-forget").post(sendForgetPassword);
UserRouter.route("/forget/:email/:token").get(checkExpiryForget);
UserRouter.route("/forget-password").patch(forgetPassword);
UserRouter.use(checkAuth);
UserRouter.route("/logout").post(logout);
UserRouter.route("/current-user").get(currentUser);
UserRouter.route("/update-currency").patch(updateCurrency);
UserRouter.route("/update-profile").patch(updateProfile);
UserRouter.route("/update-avatar").patch(upload.single("avatar"), updateAvatar);
UserRouter.route("/update-password").patch(updatePassword);

export { UserRouter };  
