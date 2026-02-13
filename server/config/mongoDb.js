import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Server connected to database");
  } catch (error) {
    console.error("Error connecting to database:", error.message);
    process.exit(1); // stops app if DB fails
  }
};

export default connectDb;
