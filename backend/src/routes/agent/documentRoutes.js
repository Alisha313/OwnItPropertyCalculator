/**
 * @file documentRoutes.js
 * @description Document/file metadata management for listings.
 *              Stores document metadata (URL, type, name) — actual file hosting
 *              is external (S3, Cloudinary, etc.).
 *
 * Endpoints:
 *   POST   /api/agent/documents         - Attach document to a listing
 *   GET    /api/agent/documents/:listingId - Get documents for a listing
 *   DELETE /api/agent/documents/:id      - Remove document
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

// POST /api/agent/documents
router.post("/", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const { listing_id, name, url, doc_type } = req.body;

    if (!listing_id || !name || !url) {
      return res.status(400).json({ error: "listing_id, name, and url are required" });
    }

    const doc = {
      listing_id,
      name,
      url,
      doc_type: doc_type || "other",
      uploaded_by: req.user.id,
      created_at: new Date().toISOString(),
    };

    const result = await mongo.documents().insertOne(doc);
    res.json({ ok: true, id: result.insertedId });
  } catch (error) {
    console.error("Upload document error:", error);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

// GET /api/agent/documents/:listingId
router.get("/:listingId", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const docs = await mongo.documents()
      .find({ listing_id: req.params.listingId })
      .sort({ created_at: -1 })
      .toArray();
    res.json({ documents: docs });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// DELETE /api/agent/documents/:id
router.delete("/:id", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const oid = getObjectId(req.params.id);
    if (!oid) return res.status(400).json({ error: "Invalid document ID" });

    await mongo.documents().deleteOne({ _id: oid });
    res.json({ ok: true });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
