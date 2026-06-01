/**
 * @file appointmentRoutes.js
 * @description Appointment scheduling for property viewings.
 *
 * Endpoints:
 *   GET   /api/agent/appointments      - All appointments
 *   POST  /api/agent/appointments      - Create appointment
 *   PATCH /api/agent/appointments/:id  - Update/confirm/cancel
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

// GET /api/agent/appointments
router.get("/", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    // Show customer booking requests (agent_id null) and this agent's own entries
    const appointments = await mongo.appointments()
      .find({
        $or: [
          { agent_id: req.user.id },
          { agent_id: null },
          { agent_id: { $exists: false } },
        ],
      })
      .sort({ date: 1 })
      .toArray();
    res.json({ appointments });
  } catch (error) {
    console.error("Appointments list error:", error);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// POST /api/agent/appointments
router.post("/", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const { date, time, client_name, listing_id, notes } = req.body;

    if (!date || !client_name) {
      return res.status(400).json({ error: "date and client_name are required" });
    }

    const appointment = {
      agent_id: req.user.id,
      date,
      time: time || null,
      client_name,
      listing_id: listing_id || null,
      notes: notes || null,
      status: "pending",
      source: "agent",
      created_at: new Date().toISOString(),
    };

    const result = await mongo.appointments().insertOne(appointment);
    res.json({ ok: true, id: result.insertedId });
  } catch (error) {
    console.error("Create appointment error:", error);
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

// PATCH /api/agent/appointments/:id
router.patch("/:id", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const oid = getObjectId(req.params.id);
    if (!oid) return res.status(400).json({ error: "Invalid appointment ID" });

    const { status, date, time, notes } = req.body;
    const update = { updated_at: new Date().toISOString() };

    if (status) {
      const valid = ["pending", "confirmed", "cancelled", "completed"];
      if (!valid.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${valid.join(", ")}` });
      }
      update.status = status;
    }
    if (date) update.date = date;
    if (time !== undefined) update.time = time;
    if (notes !== undefined) update.notes = notes;

    await mongo.appointments().updateOne({ _id: oid }, { $set: update });
    res.json({ ok: true });
  } catch (error) {
    console.error("Update appointment error:", error);
    res.status(500).json({ error: "Failed to update appointment" });
  }
});

export default router;
