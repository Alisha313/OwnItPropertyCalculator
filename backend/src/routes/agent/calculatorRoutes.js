/**
 * @file calculatorRoutes.js
 * @description View calculator runs that users have performed, with listing context.
 *
 * Endpoints:
 *   GET /api/agent/calculator-runs - All calculator runs with user and listing info
 */

import express from "express";
import { mongo, connectToMongoDB, getObjectId } from "../../db/mongo.js";
import { authenticateToken } from "../authRoutes.js";
import { requireAgent } from "../../middleware/requireAgent.js";

const router = express.Router();

let initialized = false;
async function ensureInit() {
  if (!initialized) { await connectToMongoDB(); initialized = true; }
}

// POST /api/agent/calculator-runs/track (called by regular users — no agent role required)
router.post("/track", authenticateToken, async (req, res) => {
  try {
    await ensureInit();
    if (!req.user) return res.status(401).json({ error: "Auth required" });

    const { listing_id, purchase_price, down_payment, term_years, interest_rate, monthly_payment } = req.body;

    // Deduplicate: only one run per user+listing per 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const recent = await mongo.calculator_runs().findOne({
      user_id: req.user.id,
      listing_id: listing_id || null,
      created_at: { $gte: fiveMinAgo }
    });
    if (recent) return res.json({ ok: true, deduplicated: true });

    await mongo.calculator_runs().insertOne({
      user_id: req.user.id,
      listing_id: listing_id || null,
      purchase_price: purchase_price || 0,
      down_payment: down_payment || 0,
      term_years: term_years || 30,
      interest_rate: interest_rate || 0,
      monthly_payment: monthly_payment || 0,
      created_at: new Date().toISOString(),
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("Track calc run error:", error);
    res.status(500).json({ error: "Failed to track" });
  }
});

// GET /api/agent/calculator-runs
router.get("/", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();

    const runs = await mongo.calculator_runs()
      .find({})
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();

    // Enrich with user info
    const userIds = [...new Set(runs.map(r => r.user_id).filter(Boolean))];
    const users = await mongo.users().find({
      $or: userIds.map(id => {
        const oid = getObjectId(id);
        return oid ? { _id: oid } : { _id: id };
      })
    }).toArray();

    const userMap = {};
    for (const u of users) userMap[u._id.toString()] = u;

    const enriched = runs.map(r => ({
      ...r,
      user_name: userMap[r.user_id]?.name || "Anonymous",
      user_email: userMap[r.user_id]?.email || "",
    }));

    res.json({ runs: enriched });
  } catch (error) {
    console.error("Calculator runs error:", error);
    res.status(500).json({ error: "Failed to fetch calculator runs" });
  }
});

export default router;
