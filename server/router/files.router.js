import express from "express";
import upload from "../middleware/multer.middleware.js";
import auth from "../middleware/auth.middleware.js";
import {
  downloadEncryptedFile,
  getMyDocuments,
  uploadEncryptedDocument,
} from "../controllers/file.controllers.js";
const fileRouter = express.Router();

fileRouter.post(
  "/upload-encrypted-file",
  auth,
  upload.single("file"),
  uploadEncryptedDocument,
);

// List all user's documents
fileRouter.get("/my-documents", auth, getMyDocuments);

// Download encrypted file (for view/decrypt on frontend)
fileRouter.get("/download/:id", auth, downloadEncryptedFile);
export default fileRouter;
