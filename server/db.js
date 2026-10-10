import mongoose from "mongoose";
mongoose.set("bufferCommands",false);
export const dbUp=()=>mongoose.connection.readyState===1;
export async function connectDB(){if(!process.env.MONGO_URI){console.warn("MONGO_URI missing: using in-memory prototype storage.");return false}try{await mongoose.connect(process.env.MONGO_URI,{dbName:process.env.MONGO_DB||"kasanidhi",serverSelectionTimeoutMS:5000});console.log("MongoDB connected");return true}catch(e){console.error("MongoDB connection failed; using memory fallback:",e.message);return false}}
