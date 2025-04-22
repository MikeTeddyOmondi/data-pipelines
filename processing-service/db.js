import { config } from "dotenv";
import { connect } from "mongoose";

config();

const connectDB = async () => {
  try {
    await connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
