/**
 * @file commissionRoutes.js
 * @description Private commission tracker for agents to log closed deals and earnings.
 *
 * Endpoints:
 *   POST  /api/agent/commissions     - Log a commission
 *   GET   /api/agent/commissions     - List all commissions for this agent
 *   PATCH /api/agent/commissions/:id - Update commission record
 *   DELETE /api/agent/commissions/:id - Delete commission record
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

// POST /api/agent/commissions
router.post("/", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const { listing_id, client_name, sale_price, commission_rate, commission_amount, closed_date, notes } = req.body;

    if (!sale_price || !commission_amount) {
      return res.status(400).json({ error: "sale_price and commission_amount are required" });
    }

    const commission = {
      agent_id: req.user.id,
      listing_id: listing_id || null,
      client_name: client_name || null,
      sale_price: Number(sale_price),
      commission_rate: commission_rate ? Number(commission_rate) : null,
      commission_amount: Number(commission_amount),
      closed_date: closed_date || new Date().toISOString().split("T")[0],
      notes: notes || null,
      created_at: new Date().toISOString(),
    };

    const result = await mongo.commissions().insertOne(commission);
    res.json({ ok: true, id: result.insertedId });
  } catch (error) {
    console.error("Create commission error:", error);
    res.status(500).json({ error: "Failed to log commission" });
  }
});

// GET /api/agent/commissions
router.get("/", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const commissions = await mongo.commissions()
      .find({ agent_id: req.user.id })
      .sort({ closed_date: -1 })
      .toArray();

    const totalEarnings = commissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    res.json({ commissions, total_earnings: totalEarnings, count: commissions.length });
  } catch (error) {
    console.error("List commissions error:", error);
    res.status(500).json({ error: "Failed to fetch commissions" });
  }
});

// PATCH /api/agent/commissions/:id
router.patch("/:id", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const oid = getObjectId(req.params.id);
    if (!oid) return res.status(400).json({ error: "Invalid commission ID" });

    const { client_name, sale_price, commission_rate, commission_amount, closed_date, notes } = req.body;
    const update = { updated_at: new Date().toISOString() };

    if (client_name !== undefined) update.client_name = client_name;
    if (sale_price !== undefined) update.sale_price = Number(sale_price);
    if (commission_rate !== undefined) update.commission_rate = Number(commission_rate);
    if (commission_amount !== undefined) update.commission_amount = Number(commission_amount);
    if (closed_date !== undefined) update.closed_date = closed_date;
    if (notes !== undefined) update.notes = notes;

    await mongo.commissions().updateOne({ _id: oid, agent_id: req.user.id }, { $set: update });
    res.json({ ok: true });
  } catch (error) {
    console.error("Update commission error:", error);
    res.status(500).json({ error: "Failed to update commission" });
  }
});

// DELETE /api/agent/commissions/:id
router.delete("/:id", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const oid = getObjectId(req.params.id);
    if (!oid) return res.status(400).json({ error: "Invalid commission ID" });

    await mongo.commissions().deleteOne({ _id: oid, agent_id: req.user.id });
    res.json({ ok: true });
  } catch (error) {
    console.error("Delete commission error:", error);
    res.status(500).json({ error: "Failed to delete commission" });
  }
});

export default router;
