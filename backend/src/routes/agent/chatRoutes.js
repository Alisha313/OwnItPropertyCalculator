/**
 * @file chatRoutes.js (agent)
 * @description Agent-facing chat panel. View all user sessions and reply as a human agent.
 *
 * Endpoints:
 *   GET  /api/agent/chats                       - All chat sessions with user info
 *   GET  /api/agent/chats/:sessionId/messages   - Messages for a session
 *   POST /api/agent/chats/:sessionId/reply      - Send reply as human agent
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

// GET /api/agent/chats
router.get("/", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const sessions = await mongo.chat_sessions()
      .find({})
      .sort({ started_at: -1 })
      .toArray();

    // Enrich with user info — user_id may be stored as a string or ObjectId
    const userIds = [...new Set(sessions.map(s => s.user_id).filter(Boolean))];

    // Build a query that matches both _id as ObjectId and _id as string
    const orClauses = [];
    for (const id of userIds) {
      const oid = getObjectId(id);
      if (oid) orClauses.push({ _id: oid });
      orClauses.push({ _id: id });
    }

    const users = orClauses.length > 0
      ? await mongo.users().find({ $or: orClauses }).toArray()
      : [];

    const userMap = {};
    for (const u of users) {
      userMap[u._id.toString()] = u;
    }

    const enriched = sessions.map(s => ({
      ...s,
      _id: s._id.toString(),
      session_type: s.session_type || "ai",
      user_name: userMap[String(s.user_id)]?.name || "Unknown",
      user_email: userMap[String(s.user_id)]?.email || "",
    }));

    // Human (live) chats first so agents see customer requests at the top
    enriched.sort((a, b) => {
      if (a.session_type === "human" && b.session_type !== "human") return -1;
      if (b.session_type === "human" && a.session_type !== "human") return 1;
      return (b.started_at || "").localeCompare(a.started_at || "");
    });

    res.json({ sessions: enriched });
  } catch (error) {
    console.error("Agent chats error:", error);
    res.status(500).json({ error: "Failed to fetch chat sessions" });
  }
});

// GET /api/agent/chats/:sessionId/messages
router.get("/:sessionId/messages", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const sessionId = getObjectId(req.params.sessionId);
    if (!sessionId) return res.status(400).json({ error: "Invalid session ID" });

    const messages = await mongo.chat_messages()
      .find({ session_id: sessionId })
      .sort({ created_at: 1 })
      .toArray();

    res.json({ messages });
  } catch (error) {
    console.error("Chat messages error:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /api/agent/chats/:sessionId/reply
router.post("/:sessionId/reply", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const sessionId = getObjectId(req.params.sessionId);
    if (!sessionId) return res.status(400).json({ error: "Invalid session ID" });

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    await mongo.chat_messages().insertOne({
      session_id: sessionId,
      role: "agent",
      content: message.trim(),
      sent_by_agent: req.user.id,
      created_at: new Date().toISOString(),
    });

    await mongo.chat_sessions().updateOne(
      { _id: sessionId },
      { $inc: { total_messages: 1 } }
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Agent reply error:", error);
    res.status(500).json({ error: "Failed to send reply" });
  }
});

export default router;
