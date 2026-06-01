/**
 * @file openHouseRoutes.js
 * @description Open house event scheduling for listings.
 *
 * Endpoints:
 *   POST   /api/agent/open-houses        - Create open house event
 *   GET    /api/agent/open-houses         - List all open houses
 *   GET    /api/agent/open-houses/:listingId - Open houses for a listing
 *   DELETE /api/agent/open-houses/:id     - Remove open house event
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

// POST /api/agent/open-houses
router.post("/", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const { listing_id, date, start_time, end_time, notes } = req.body;

    if (!listing_id || !date) {
      return res.status(400).json({ error: "listing_id and date are required" });
    }

    const event = {
      listing_id,
      agent_id: req.user.id,
      date,
      start_time: start_time || null,
      end_time: end_time || null,
      notes: notes || null,
      created_at: new Date().toISOString(),
    };

    const result = await mongo.open_houses().insertOne(event);
    res.json({ ok: true, id: result.insertedId });
  } catch (error) {
    console.error("Create open house error:", error);
    res.status(500).json({ error: "Failed to create open house" });
  }
});

// GET /api/agent/open-houses
router.get("/", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const events = await mongo.open_houses()
      .find({ agent_id: req.user.id })
      .sort({ date: 1 })
      .toArray();
    res.json({ events });
  } catch (error) {
    console.error("List open houses error:", error);
    res.status(500).json({ error: "Failed to fetch open houses" });
  }
});

// GET /api/agent/open-houses/:listingId
router.get("/:listingId", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const events = await mongo.open_houses()
      .find({ listing_id: req.params.listingId })
      .sort({ date: 1 })
      .toArray();
    res.json({ events });
  } catch (error) {
    console.error("Get open houses error:", error);
    res.status(500).json({ error: "Failed to fetch open houses" });
  }
});

// DELETE /api/agent/open-houses/:id
router.delete("/:id", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const oid = getObjectId(req.params.id);
    if (!oid) return res.status(400).json({ error: "Invalid open house ID" });

    await mongo.open_houses().deleteOne({ _id: oid });
    res.json({ ok: true });
  } catch (error) {
    console.error("Delete open house error:", error);
    res.status(500).json({ error: "Failed to delete open house" });
  }
});

export default router;
