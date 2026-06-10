/**
 * @file listingMgmtRoutes.js
 * @description Full CRUD for property listings (agent-facing).
 *
 * Endpoints:
 *   GET    /api/agent/listings           - All listings
 *   POST   /api/agent/listings           - Create listing
 *   PUT    /api/agent/listings/:id       - Update listing
 *   DELETE /api/agent/listings/:id       - Remove listing
 *   PATCH  /api/agent/listings/:id/status - Mark as sold/rented/active
 */

import express from "express";
import { mongo, connectToMongoDB } from "../../db/mongo.js";
import { authenticateToken } from "../authRoutes.js";
import { requireAgent } from "../../middleware/requireAgent.js";
import { buildActiveDiscountMap, applyActiveDiscount } from "../../utils/discountUtils.js";

const router = express.Router();

let initialized = false;
async function ensureInit() {
  if (!initialized) { await connectToMongoDB(); initialized = true; }
}

// GET /api/agent/listings
router.get("/", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const listings = await mongo.listings().find({}).sort({ price: -1 }).toArray();

    const discounts = await mongo.discounts().find({}).toArray();
    const discountMap = buildActiveDiscountMap(discounts);

    const enriched = listings.map(l => {
      const copy = { ...l };
      applyActiveDiscount(copy, discountMap[l.id]);
      return copy;
    });

    res.json({ listings: enriched });
  } catch (error) {
    console.error("Agent listings error:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// POST /api/agent/listings
router.post("/", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const { kind, type, address, city, state, description, price, sqft, bedrooms, bathrooms, year_built, image_url, lat, lng } = req.body;

    if (!kind || !address || !city || !state || !price) {
      return res.status(400).json({ error: "kind, address, city, state, and price are required" });
    }

    const id = `${kind === "rental" ? "rent" : "sale"}_${state}_${Date.now()}`;

    const listing = {
      id,
      kind,
      type: type || "Single Family",
      city,
      state: state.toUpperCase(),
      address,
      description: description || "",
      image_url: image_url || null,
      status: "active",
      price: Number(price),
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      sqft: sqft ? Number(sqft) : null,
      year_built: year_built ? Number(year_built) : null,
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
      created_by: req.user.id,
      created_at: new Date().toISOString(),
    };

    await mongo.listings().insertOne(listing);
    res.json({ ok: true, listing });
  } catch (error) {
    console.error("Create listing error:", error);
    res.status(500).json({ error: "Failed to create listing" });
  }
});

// PUT /api/agent/listings/:id
router.put("/:id", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const { kind, type, address, city, state, description, price, sqft, bedrooms, bathrooms, year_built, image_url, lat, lng } = req.body;

    const update = {};
    if (kind) update.kind = kind;
    if (type) update.type = type;
    if (address) update.address = address;
    if (city) update.city = city;
    if (state) update.state = state.toUpperCase();
    if (description !== undefined) update.description = description;
    if (price !== undefined) update.price = Number(price);
    if (sqft !== undefined) update.sqft = sqft ? Number(sqft) : null;
    if (bedrooms !== undefined) update.bedrooms = bedrooms ? Number(bedrooms) : null;
    if (bathrooms !== undefined) update.bathrooms = bathrooms ? Number(bathrooms) : null;
    if (year_built !== undefined) update.year_built = year_built ? Number(year_built) : null;
    if (image_url !== undefined) update.image_url = image_url || null;
    if (lat !== undefined) update.lat = lat ? Number(lat) : null;
    if (lng !== undefined) update.lng = lng ? Number(lng) : null;
    update.updated_at = new Date().toISOString();

    const result = await mongo.listings().updateOne({ id: req.params.id }, { $set: update });
    if (result.matchedCount === 0) return res.status(404).json({ error: "Listing not found" });

    res.json({ ok: true });
  } catch (error) {
    console.error("Update listing error:", error);
    res.status(500).json({ error: "Failed to update listing" });
  }
});

// DELETE /api/agent/listings/:id
router.delete("/:id", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const result = await mongo.listings().deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Listing not found" });

    // Also remove associated discounts
    await mongo.discounts().deleteMany({ listing_id: req.params.id });

    res.json({ ok: true });
  } catch (error) {
    console.error("Delete listing error:", error);
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

// PATCH /api/agent/listings/:id/status
router.patch("/:id/status", authenticateToken, requireAgent, async (req, res) => {
  try {
    await ensureInit();
    const { status } = req.body;
    const valid = ["active", "sold", "rented", "pending"];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${valid.join(", ")}` });
    }

    const result = await mongo.listings().updateOne(
      { id: req.params.id },
      { $set: { status, updated_at: new Date().toISOString() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: "Listing not found" });

    res.json({ ok: true });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ error: "Failed to update listing status" });
  }
});

export default router;
