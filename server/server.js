import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/mongoDb.js";
import authRouter from "./router/auth.router.js";
import cookieParser from "cookie-parser";
import cors from "cors";
dotenv.config();

const app = express();

await connectDb();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173", // frontend URL
    credentials: true, // 🔴 REQUIRED FOR COOKIES
  }),
);

app.use("/api/auth", authRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
