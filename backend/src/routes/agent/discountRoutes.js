/**
 * @file discountRoutes.js
 * @description Apply, list, and remove discounts/offers on listings.
 *
 * Endpoints:
 *   POST   /api/agent/discounts      - Apply discount to a listing
 *   GET    /api/agent/discounts      - List all active discounts
 *   DELETE /api/agent/discounts/:id  - Remove discount (by listing_id)
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

// POST /api/agent/discounts
router.post("/", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const { listing_id, type, amount, expires_at } = req.body;

    if (!listing_id || !type || amount === undefined) {
      return res.status(400).json({ error: "listing_id, type, and amount are required" });
    }

    if (!["percent", "flat"].includes(type)) {
      return res.status(400).json({ error: "type must be 'percent' or 'flat'" });
    }

    // Upsert: one discount per listing
    await mongo.discounts().updateOne(
      { listing_id },
      {
        $set: {
          listing_id,
          type,
          amount: Number(amount),
          expires_at: expires_at || null,
          created_by: req.user.id,
          updated_at: new Date().toISOString(),
        },
        $setOnInsert: { created_at: new Date().toISOString() }
      },
      { upsert: true }
    );

    // Flag listing as price_reduced
    await mongo.listings().updateOne(
      { id: listing_id },
      { $set: { price_reduced: true, updated_at: new Date().toISOString() } }
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Apply discount error:", error);
    res.status(500).json({ error: "Failed to apply discount" });
  }
});

// GET /api/agent/discounts
router.get("/", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const discounts = await mongo.discounts().find({}).sort({ updated_at: -1 }).toArray();
    res.json({ discounts });
  } catch (error) {
    console.error("List discounts error:", error);
    res.status(500).json({ error: "Failed to fetch discounts" });
  }
});

// DELETE /api/agent/discounts/:id (listing_id)
router.delete("/:id", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    await mongo.discounts().deleteOne({ listing_id: req.params.id });

    // Remove price_reduced flag
    await mongo.listings().updateOne(
      { id: req.params.id },
      { $set: { price_reduced: false, updated_at: new Date().toISOString() } }
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Remove discount error:", error);
    res.status(500).json({ error: "Failed to remove discount" });
  }
});

export default router;
