/**
 * @file analyticsRoutes.js
 * @description Listing performance, market comparison, and subscriber visibility.
 *
 * Endpoints:
 *   GET /api/agent/analytics/listings          - Views, calculator runs per listing
 *   GET /api/agent/analytics/market-comparison - Compare listing price/sqft vs market
 *   GET /api/agent/analytics/subscribers       - Users by subscription tier
 */

import express from "express";
import { mongo, connectToMongoDB } from "../../db/mongo.js";
import { authenticateToken } from "../authRoutes.js";
import { requireAgent } from "../../middleware/requireAgent.js";

const router = express.Router();

let initialized = false;
async function ensureInit() {
  if (!initialized) { await connectToMongoDB(); initialized = true; }
}

// GET /api/agent/analytics/listings
router.get("/listings", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();

    const listings = await mongo.listings().find({}).toArray();
    const calcRuns = await mongo.calculator_runs().find({}).toArray();
    const leads = await mongo.leads().find({}).toArray();

    // Aggregate calc runs per listing
    const calcByListing = {};
    for (const run of calcRuns) {
      const lid = run.listing_id || "unknown";
      calcByListing[lid] = (calcByListing[lid] || 0) + 1;
    }

    const performance = listings.slice(0, 20).map(l => ({
      id: l.id,
      city: l.city,
      state: l.state,
      price: l.price,
      calculator_runs: calcByListing[l.id] || 0,
    }));

    res.json({
      total: listings.length,
      total_calculator_runs: calcRuns.length,
      total_leads: leads.length,
      performance,
    });
  } catch (error) {
    console.error("Analytics listings error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// GET /api/agent/analytics/market-comparison
router.get("/market-comparison", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();

    const listings = await mongo.listings().find({ status: "active", kind: "sale", sqft: { $gt: 0 } }).limit(10).toArray();
    const comparisons = [];

    for (const listing of listings) {
      const trend = await mongo.market_trends().findOne(
        { city: { $regex: new RegExp(`^${listing.city}$`, "i") }, state: listing.state },
        { sort: { year: -1, quarter: -1 } }
      );

      if (trend) {
        comparisons.push({
          id: listing.id,
          city: listing.city,
          state: listing.state,
          listing_price_sqft: Math.round(listing.price / listing.sqft),
          market_price_sqft: Math.round(trend.price_per_sqft),
        });
      }
    }

    res.json({ comparisons });
  } catch (error) {
    console.error("Market comparison error:", error);
    res.status(500).json({ error: "Failed to fetch market comparison" });
  }
});

// GET /api/agent/analytics/subscribers
router.get("/subscribers", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();

    const subscriptions = await mongo.subscriptions().find({}).toArray();
    const users = await mongo.users().find({ role: { $ne: "agent" } }).toArray();
    const plans = await mongo.subscription_plans().find({}).toArray();

    const planMap = {};
    for (const p of plans) planMap[p._id?.toString()] = p.name;

    const subMap = {};
    for (const s of subscriptions) subMap[s.user_id?.toString()] = s;

    const subscribers = users.map(u => {
      const sub = subMap[u._id.toString()];
      return {
        name: u.name,
        email: u.email,
        plan_name: sub?.plan_id ? (planMap[sub.plan_id.toString()] || "Unknown") : "Free",
        status: sub?.status || "none",
      };
    });

    const proCount = subscribers.filter(s => s.plan_name.toLowerCase().includes("pro")).length;

    res.json({ subscribers, pro_count: proCount, total: subscribers.length });
  } catch (error) {
    console.error("Subscribers error:", error);
    res.status(500).json({ error: "Failed to fetch subscribers" });
  }
});

export default router;
