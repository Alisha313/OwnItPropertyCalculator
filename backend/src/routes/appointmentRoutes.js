/**
 * @file appointmentRoutes.js
 * @description Customer-facing appointment booking (property viewings).
 *
 * Endpoints:
 *   POST /api/appointments      - Book a viewing (authenticated user)
 *   GET  /api/appointments      - List current user's appointments
 */

import express from "express";
import { mongo, connectToMongoDB } from "../db/mongo.js";
import { authenticateToken } from "./authRoutes.js";

const router = express.Router();

let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await connectToMongoDB();
    initialized = true;
  }
}

// POST /api/appointments — customer books a viewing
router.post("/", authenticateToken, async (req, res) => {
  try {
    await ensureInit();
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { date, time, listing_id, notes } = req.body;
    if (!date) {
      return res.status(400).json({ error: "date is required" });
    }

    const appointment = {
      user_id: req.user.id,
      client_name: req.user.name || "Customer",
      client_email: req.user.email || "",
      date,
      time: time || null,
      listing_id: listing_id || null,
      notes: notes || null,
      status: "pending",
      source: "customer",
      agent_id: null,
      created_at: new Date().toISOString(),
    };

    const result = await mongo.appointments().insertOne(appointment);

    // Move lead to viewing stage if exists
    await mongo.leads().updateOne(
      { user_id: req.user.id },
      { $set: { stage: "viewing_scheduled", updated_at: new Date().toISOString() } }
    );

    res.json({
      ok: true,
      id: result.insertedId,
      message: "Your viewing request was sent! An agent will confirm on their calendar.",
    });
  } catch (error) {
    console.error("Book appointment error:", error);
    res.status(500).json({ error: "Failed to book appointment" });
  }
});

// GET /api/appointments — customer's own appointments
router.get("/", authenticateToken, async (req, res) => {
  try {
    await ensureInit();
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const appointments = await mongo.appointments()
      .find({ user_id: req.user.id })
      .sort({ date: 1 })
      .toArray();

    res.json({ appointments });
  } catch (error) {
    console.error("List appointments error:", error);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

export default router;
