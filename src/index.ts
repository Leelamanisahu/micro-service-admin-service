import express from "express";
import dotenv from "dotenv";
import { sql } from "./config/db.js";
import adminRouter from "./router/adminRoute.js";
import cloudinary from "cloudinary";
import redis from "redis";
import cors from "cors";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME as string,
  api_key: process.env.CLOUD_API_KEY as string,
  api_secret: process.env.CLOUD_API_SECRET as string,
});

export const redisClient = redis.createClient({
  password: process.env.REDIS_PASSWORD as string,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 10003,
    // Add connection timeout and keep alive
    connectTimeout: 10000,
    reconnectStrategy: (retries) => {
      if (retries >= 10) {
        console.log("Redis reconnection attempts exceeded, giving up");
        return new Error("Redis reconnection failed");
      }
      console.log(`Redis reconnection attempt ${retries + 1}`);
      return Math.min(retries * 100, 3000);
    },
  },
});

// Add comprehensive error handling
redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
  // Don't exit the process, just log the error
});

redisClient.on("connect", () => {
  console.log("Redis client connected");
});

redisClient.on("ready", () => {
  console.log("Redis client ready to use");
});

redisClient.on("end", () => {
  console.log("Redis client disconnected");
});

redisClient.on("reconnecting", () => {
  console.log("Redis client reconnecting...");
});

// Connect to Redis with better error handling
async function connectRedis() {
  try {
    await redisClient.connect();
    console.log("Connected to Redis successfully");
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    console.log("Application will continue without Redis caching");
  }
}

// Initialize Redis connection
connectRedis();

async function initDb() {
  try {
    await sql`
                CREATE TABLE IF NOT EXISTS albums (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description VARCHAR(255) NOT NULL,
                thumbnail VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`;

    await sql`
                CREATE TABLE IF NOT EXISTS songs (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description VARCHAR(255) NOT NULL,
                thumbnail VARCHAR(255),
                audio VARCHAR(255) NOT NULL,
                album_id INTEGER  REFERENCES albums(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`;

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

const PORT = process.env.PORT || 7000;

app.use("/api/v1", adminRouter);

initDb().then(() => {
  app.listen(PORT, () => {
    console.log("Admin service is running on port 7000");
  });
});
