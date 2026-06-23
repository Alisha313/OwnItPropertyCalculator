/**
 * @file humanChatRoutes.js
 * @description Direct chat between customers and human agents (no AI auto-reply).
 *
 * Endpoints:
 *   GET  /api/human-chat/session   - Get or create human chat session
 *   POST /api/human-chat/message   - Send message to agents
 */

import express from "express";
import { mongo, connectToMongoDB } from "../db/mongo.js";
import { authenticateToken } from "./authRoutes.js";
import { hasHumanChatAccess, resolveUserId } from "../utils/chatAccessUtils.js";
import { userIdQuery } from "../utils/userQuery.js";

const router = express.Router();

let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await connectToMongoDB();
    initialized = true;
  }
}

// GET /api/human-chat/session
router.get("/session", authenticateToken, async (req, res) => {
  try {
    await ensureInit();
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const access = await hasHumanChatAccess(req.user.id, req.subscription);
    if (!access.hasAccess) {
      return res.json({
        hasAccess: false,
        message: access.message,
      });
    }

    const storedUserId = resolveUserId(req.user.id);

    let session = await mongo.chat_sessions().findOne({
      ...userIdQuery(req.user.id),
      session_type: "human",
    });

    if (!session) {
      const result = await mongo.chat_sessions().insertOne({
        user_id: storedUserId,
        session_type: "human",
        started_at: new Date().toISOString(),
        total_messages: 1,
      });
      session = { _id: result.insertedId };

      await mongo.chat_messages().insertOne({
        session_id: result.insertedId,
        role: "agent",
        content:
          "Hi! You're connected with the OwnIt agent team. Send your question and a licensed agent will reply here shortly.",
        sent_by_agent: null,
        created_at: new Date().toISOString(),
      });

      const existingLead = await mongo.leads().findOne(userIdQuery(req.user.id));
      if (!existingLead) {
        await mongo.leads().insertOne({
          user_id: storedUserId,
          user_name: req.user.name || "Unknown",
          user_email: req.user.email || "",
          source_listing_id: null,
          stage: "new",
          created_at: new Date().toISOString(),
        });
      }
    }

    const messages = await mongo.chat_messages()
      .find({ session_id: session._id })
      .sort({ created_at: 1 })
      .project({ role: 1, content: 1, created_at: 1, sent_by_agent: 1 })
      .toArray();

    res.json({
      hasAccess: true,
      accessSource: access.accessSource,
      daysRemaining: access.daysRemaining,
      sessionId: session._id.toString(),
      messages,
    });
  } catch (error) {
    console.error("Human chat session error:", error);
    res.status(500).json({ error: "Failed to get chat session" });
  }
});

// POST /api/human-chat/message
router.post("/message", authenticateToken, async (req, res) => {
  try {
    await ensureInit();
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const access = await hasHumanChatAccess(req.user.id, req.subscription);
    if (!access.hasAccess) {
      return res.status(403).json({
        error: access.message,
        upgradeRequired: true,
      });
    }

    const { message, listing_id } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const storedUserId = resolveUserId(req.user.id);

    let session = await mongo.chat_sessions().findOne({
      ...userIdQuery(req.user.id),
      session_type: "human",
    });

    if (!session) {
      const result = await mongo.chat_sessions().insertOne({
        user_id: storedUserId,
        session_type: "human",
        started_at: new Date().toISOString(),
        total_messages: 0,
      });
      session = { _id: result.insertedId };
    }

    await mongo.chat_messages().insertOne({
      session_id: session._id,
      role: "user",
      content: message.trim(),
      listing_id: listing_id || null,
      created_at: new Date().toISOString(),
    });

    await mongo.chat_sessions().updateOne(
      { _id: session._id },
      { $inc: { total_messages: 1 } }
    );

    const existingLead = await mongo.leads().findOne(userIdQuery(req.user.id));
    if (!existingLead) {
      await mongo.leads().insertOne({
        user_id: storedUserId,
        user_name: req.user.name || "Unknown",
        user_email: req.user.email || "",
        source_listing_id: listing_id || null,
        stage: "new",
        created_at: new Date().toISOString(),
      });
    }

    res.json({
      ok: true,
      sessionId: session._id.toString(),
      userMessage: message.trim(),
    });
  } catch (error) {
    console.error("Human chat message error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
