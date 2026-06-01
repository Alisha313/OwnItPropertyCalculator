/**
 * @file app.js
 * @project OwnIt Property Calculator
 * @description Configures and exports the Express application.
 *              Registers middleware (CORS, JSON parsing, cookies) and
 *              mounts all API route groups. Also handles static asset
 *              serving and SPA fallback for local development.
 */

import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import listingRoutes from "./routes/listingRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import agentLeadRoutes from "./routes/agent/leadRoutes.js";
import agentListingRoutes from "./routes/agent/listingMgmtRoutes.js";
import agentDiscountRoutes from "./routes/agent/discountRoutes.js";
import agentChatRoutes from "./routes/agent/chatRoutes.js";
import agentAppointmentRoutes from "./routes/agent/appointmentRoutes.js";
import agentAnalyticsRoutes from "./routes/agent/analyticsRoutes.js";
import agentCalculatorRoutes from "./routes/agent/calculatorRoutes.js";
import agentDocumentRoutes from "./routes/agent/documentRoutes.js";
import agentOpenHouseRoutes from "./routes/agent/openHouseRoutes.js";
import agentCommissionRoutes from "./routes/agent/commissionRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import humanChatRoutes from "./routes/humanChatRoutes.js";

// Resolve __dirname in ES Module scope (not available natively)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect AWS Lambda environment to adjust static file serving behavior
const isLambda = !!process.env.LAMBDA_TASK_ROOT;

// Repo root is one level above /backend — used to serve the frontend
const repoRoot = path.resolve(__dirname, "../../");
const assetsDir = path.join(repoRoot, "assets");
const indexHtml = path.join(repoRoot, "index.html");

const app = express();

// ── Core Middleware ───────────────────────────────────────────────────────────
app.use(express.json());    // Parse incoming JSON request bodies
app.use(cookieParser());     // Parse Cookie header for session handling

/**
 * CORS middleware — required for cross-origin requests during local development.
 * In production, CloudFront acts as a proxy and makes all requests same-origin,
 * so the CORS headers are effectively a no-op there.
 */
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  // Respond immediately to preflight OPTIONS requests
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ── Static Assets (local dev only) ───────────────────────────────────────────
// In Lambda, the frontend is served from S3 via CloudFront — skip static serving
if (!isLambda) {
  app.use("/assets", express.static(assetsDir));
}

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);                   // User registration, login, logout
app.use("/api/listings", listingRoutes);            // Property listings (sales & rentals)
app.use("/api/subscriptions", subscriptionRoutes);  // Subscription plans and status
app.use("/api/chat", chatRoutes);                   // AI chat sessions and messages
app.use("/api/human-chat", humanChatRoutes);        // Direct chat with human agents
app.use("/api/appointments", appointmentRoutes);  // Customer viewing requests
app.use("/api/ai", aiRoutes);                       // AI-powered property valuation

// ── Agent Portal API Routes ──────────────────────────────────────────────────
app.use("/api/agent/leads", agentLeadRoutes);
app.use("/api/agent/listings", agentListingRoutes);
app.use("/api/agent/discounts", agentDiscountRoutes);
app.use("/api/agent/chats", agentChatRoutes);
app.use("/api/agent/appointments", agentAppointmentRoutes);
app.use("/api/agent/analytics", agentAnalyticsRoutes);
app.use("/api/agent/calculator-runs", agentCalculatorRoutes);
app.use("/api/agent/documents", agentDocumentRoutes);
app.use("/api/agent/open-houses", agentOpenHouseRoutes);
app.use("/api/agent/commissions", agentCommissionRoutes);

// ── Health Check ─────────────────────────────────────────────────────────────
// Used by load balancers and uptime monitors to verify the server is responsive
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ── Agent Portal ─────────────────────────────────────────────────────────────
const agentHtml = path.join(repoRoot, "agent.html");

if (!isLambda) {
  app.get("/agent", (req, res) => res.sendFile(agentHtml));
  app.get("/agent/*", (req, res) => res.sendFile(agentHtml));
}

// ── SPA Fallback (local dev only) ────────────────────────────────────────────
// Serve index.html for any unmatched route so the client-side router handles it
if (!isLambda) {
  app.get("*", (req, res) => {
    res.sendFile(indexHtml);
  });
}

export default app;
