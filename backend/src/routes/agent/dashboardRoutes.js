/**
 * @file dashboardRoutes.js
 * @description Aggregated dashboard summary for the agent portal.
 *
 * Endpoints:
 *   GET /api/agent/dashboard/summary - Counts for sidebar badges and dashboard stats
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

router.get("/summary", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();

    const today = new Date(new Date().toDateString());
    const weekAhead = new Date(today);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const [
      newLeads,
      humanSessions,
      appointments,
      activeListings,
      recentLeads,
    ] = await Promise.all([
      mongo.leads().countDocuments({ stage: "new" }),
      mongo.chat_sessions().find({ session_type: "human" }).toArray(),
      mongo.appointments().find({ status: { $ne: "cancelled" } }).toArray(),
      mongo.listings().countDocuments({ status: "active" }),
      mongo.leads().find({}).sort({ created_at: -1 }).limit(5).toArray(),
    ]);

    const upcomingAppointments = appointments.filter(a => {
      if (!a.date) return false;
      const d = new Date(a.date);
      return d >= today && d <= weekAhead && a.status !== "confirmed";
    }).length;

    const upcomingViewings = appointments.filter(a => {
      if (!a.date || a.status === "cancelled") return false;
      return new Date(a.date) >= today;
    }).length;

    res.json({
      new_leads: newLeads,
      human_chats: humanSessions.length,
      pending_appointments: upcomingAppointments,
      upcoming_appointments: upcomingViewings,
      active_listings: activeListings,
      recent_leads: recentLeads,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

export default router;
