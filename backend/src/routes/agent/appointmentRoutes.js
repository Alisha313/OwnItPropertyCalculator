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

    const count = await mongo.appointments().countDocuments({});
    if (count === 0) {
      const listings = await mongo.listings().find({ status: "active" }).limit(3).toArray();
      const today = new Date();
      const fmt = (d) => d.toISOString().slice(0, 10);
      const samples = [
        { offset: 1, time: "10:00", client: "Sarah Mitchell", status: "confirmed" },
        { offset: 2, time: "14:30", client: "James Rodriguez", status: "pending" },
        { offset: 4, time: "11:00", client: "Emily Chen", status: "pending" },
        { offset: 6, time: "16:00", client: "Michael Brooks", status: "confirmed" },
        { offset: 9, time: "09:30", client: "Lisa Thompson", status: "pending" },
      ];
      const docs = samples.map((s, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() + s.offset);
        return {
          agent_id: req.user.id,
          date: fmt(d),
          time: s.time,
          client_name: s.client,
          client_email: `${s.client.split(" ")[0].toLowerCase()}@email.com`,
          listing_id: listings[i % listings.length]?.id || null,
          notes: "Property showing",
          status: s.status,
          source: "agent",
          created_at: new Date().toISOString(),
        };
      });
      await mongo.appointments().insertMany(docs);
    }

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
