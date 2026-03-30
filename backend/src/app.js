import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import listingRoutes from "./routes/listingRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isLambda = !!process.env.LAMBDA_TASK_ROOT;

// Your repo root is one level above /backend
const repoRoot = path.resolve(__dirname, "../../");
const assetsDir = path.join(repoRoot, "assets");
const indexHtml = path.join(repoRoot, "index.html");

const app = express();

app.use(express.json());
app.use(cookieParser());

// CORS — needed for local dev; CloudFront proxy makes this same-origin in production
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// In Lambda, frontend is served from S3/CloudFront — skip static serving
if (!isLambda) {
  app.use("/assets", express.static(assetsDir));
}

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// SPA-style fallback: only for local dev, not Lambda
if (!isLambda) {
  app.get("*", (req, res) => {
    res.sendFile(indexHtml);
  });
}

export default app;
