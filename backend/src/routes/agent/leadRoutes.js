/**
 * @file leadRoutes.js
 * @description Agent lead inbox and pipeline management.
 *
 * Endpoints:
 *   GET    /api/agent/leads          - List all leads with optional filters
 *   GET    /api/agent/leads/:id      - Lead detail with chat history, calculator runs, notes
 *   PATCH  /api/agent/leads/:id/stage - Update lead pipeline stage
 *   POST   /api/agent/leads/:id/notes - Add private note to lead
 *   GET    /api/agent/leads/:id/notes - Get notes for a lead
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

async function enrichLeadsWithListingLabels(leads) {
  const ids = [...new Set(leads.map(l => l.source_listing_id).filter(Boolean))];
  if (ids.length === 0) return leads;

  const listings = await mongo.listings()
    .find({ id: { $in: ids } })
    .project({ id: 1, address: 1, city: 1, state: 1 })
    .toArray();

  const labelMap = {};
  for (const listing of listings) {
    labelMap[listing.id] = `${listing.address}, ${listing.city}, ${listing.state}`;
  }

  return leads.map(lead => ({
    ...lead,
    source_listing_label: lead.source_listing_id
      ? (labelMap[lead.source_listing_id] || lead.source_listing_id)
      : null,
  }));
}

// GET /api/agent/leads
router.get("/", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const { stage, limit } = req.query;
    const filter = {};
    if (stage) filter.stage = stage;

    let query = mongo.leads().find(filter).sort({ created_at: -1 });
    if (limit) query = query.limit(Number(limit));

    const leads = await query.toArray();
    const enriched = await enrichLeadsWithListingLabels(leads);
    res.json({ leads: enriched });
  } catch (error) {
    console.error("Leads list error:", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// GET /api/agent/leads/:id
router.get("/:id", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const oid = getObjectId(req.params.id);
    if (!oid) return res.status(400).json({ error: "Invalid lead ID" });

    const lead = await mongo.leads().findOne({ _id: oid });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const [enrichedLead] = await enrichLeadsWithListingLabels([lead]);

    // Fetch related data
    const [notes, calcRuns] = await Promise.all([
      mongo.agent_notes().find({ lead_id: req.params.id }).sort({ created_at: -1 }).toArray(),
      mongo.calculator_runs().find({ user_id: lead.user_id }).sort({ created_at: -1 }).toArray(),
    ]);

    let session = await mongo.chat_sessions().findOne(
      { user_id: lead.user_id, session_type: "human" },
      { sort: { started_at: -1 } }
    );
    if (!session) {
      session = await mongo.chat_sessions().findOne(
        { user_id: lead.user_id },
        { sort: { started_at: -1 } }
      );
    }

    let messages = [];
    if (session) {
      messages = await mongo.chat_messages()
        .find({ session_id: session._id })
        .sort({ created_at: 1 })
        .toArray();
    }

    res.json({ lead: enrichedLead, notes, calculator_runs: calcRuns, messages });
  } catch (error) {
    console.error("Lead detail error:", error);
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

// PATCH /api/agent/leads/:id/stage
router.patch("/:id/stage", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const oid = getObjectId(req.params.id);
    if (!oid) return res.status(400).json({ error: "Invalid lead ID" });

    const { stage } = req.body;
    const valid = ["new", "contacted", "viewing_scheduled", "offer_made", "closed"];
    if (!valid.includes(stage)) {
      return res.status(400).json({ error: `Stage must be one of: ${valid.join(", ")}` });
    }

    await mongo.leads().updateOne(
      { _id: oid },
      { $set: { stage, updated_at: new Date().toISOString() } }
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Update stage error:", error);
    res.status(500).json({ error: "Failed to update stage" });
  }
});

// POST /api/agent/leads/:id/notes
router.post("/:id/notes", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Note content is required" });
    }

    await mongo.agent_notes().insertOne({
      lead_id: req.params.id,
      agent_id: req.user.id,
      content: content.trim(),
      created_at: new Date().toISOString(),
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("Add note error:", error);
    res.status(500).json({ error: "Failed to add note" });
  }
});

// GET /api/agent/leads/:id/notes
router.get("/:id/notes", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const notes = await mongo.agent_notes()
      .find({ lead_id: req.params.id })
      .sort({ created_at: -1 })
      .toArray();
    res.json({ notes });
  } catch (error) {
    console.error("Get notes error:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

export default router;
