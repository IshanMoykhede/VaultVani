import express from "express";
import upload from "../middleware/multer.middleware.js";
import auth from "../middleware/auth.middleware.js";
import { uploadEncryptedDocument } from "../controllers/file.controllers.js";
const fileRouter = express.Router();

fileRouter.post(
  "/upload-encrypted-file",
  auth,
  upload.single("file"),
  uploadEncryptedDocument,
);

export default fileRouter;
