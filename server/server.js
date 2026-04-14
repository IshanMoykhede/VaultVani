import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/mongoDb.js";
import authRouter from "./router/auth.router.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import multer from "multer";
import fileRouter from "./router/files.router.js";
import folderRouter from "./router/folder.router.js";
import chunkRouter from "./router/chunk.router.js";

dotenv.config();

const app = express();

await connectDb();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    exposedHeaders: ["X-Encrypted-IV", "X-File-Name", "X-Mime-Type"],
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use("/api/auth", authRouter);
app.use("/api/files", fileRouter);
app.use("/api/folder", folderRouter);
app.use("/api/chunks", chunkRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
