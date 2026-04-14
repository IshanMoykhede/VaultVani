import express from "express";
import { uploadChunks, getAllChunks } from "../controllers/chunk.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/upload", auth, uploadChunks);
router.get("/", auth, getAllChunks);

export default router;
