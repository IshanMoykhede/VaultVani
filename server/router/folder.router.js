import express from "express";
import { createFolder, getFolders } from "../controllers/folder.controller.js";
import auth from "../middleware/auth.middleware.js";
const folderRouter = express.Router();

folderRouter.post("/create-folder", auth, createFolder);
folderRouter.get("/get-folders", auth, getFolders);

export default folderRouter;
