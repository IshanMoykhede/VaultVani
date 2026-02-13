import express from "express";
import {
  signUp,
  signIn,
  signOut,
  genResetPassOtp,
  verifyResetOtp,
  setNewPass,
  getUser,
} from "../controllers/auth.controller.js";
import auth from "../middleware/auth.middleware.js";

const authRouter = express.Router();

authRouter.post("/signUp", signUp);
authRouter.post("/signIn", signIn);
authRouter.post("/signOut", signOut);
authRouter.post("/get-reset-otp", genResetPassOtp);
authRouter.post("/verify-reset-otp", verifyResetOtp);
authRouter.post("/set-new-pass", setNewPass);
authRouter.get("/get-user", auth, getUser);
export default authRouter;
