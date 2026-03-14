import express from "express";
import {
  signUp,
  signIn,
  signOut,
  genResetPassOtp,
  verifyResetOtp,
  setNewPass,
  getUser,
  cryptoSetup,
  getSalt,
  getVaultKeyData,
  updateVaultKey,
  recoveryMaterial, // NEW: add this import
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

// NEW ROUTE: Protected crypto setup (only logged-in users)
authRouter.post("/crypto/setup", auth, cryptoSetup);
authRouter.get("/salt/:userId", getSalt); // public ya auth se protect kar sakta hai
authRouter.get("/vault-key/:userId", auth, getVaultKeyData); // protected
authRouter.post("/update-vault-keys", updateVaultKey);
authRouter.post("/recovery-material", recoveryMaterial);

export default authRouter;
