import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import listingRoutes from "./routes/listingRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Your repo root is one level above /backend
const repoRoot = path.resolve(__dirname, "../../");
const assetsDir = path.join(repoRoot, "assets");
const indexHtml = path.join(repoRoot, "index.html");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false // set true only if using https
    }
  })
);

// Serve your existing frontend
app.use("/assets", express.static(assetsDir));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/chat", chatRoutes);

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// SPA-style fallback: always return index.html for non-API routes
app.get("*", (req, res) => {
  res.sendFile(indexHtml);
});

export default app;
