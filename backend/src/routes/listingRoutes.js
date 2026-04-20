/**
 * @file listingRoutes.js
 * @project OwnIt Property Calculator
 * @description REST API routes for property listings (sales and rentals).
 *              Supports filtered search, map data retrieval, and individual
 *              listing detail lookup. All endpoints are publicly accessible.
 *
 * Endpoints:
 *   GET /api/listings        - Search listings with filters and sorting
 *   GET /api/listings/map    - Listings with lat/lng for map display
 *   GET /api/listings/:id    - Single listing detail
 */

import express from "express";
import { mongo, connectToMongoDB, seedDatabase } from "../db/mongo.js";

const router = express.Router();

// Lazy initialization flag: connect to MongoDB on the first request
let initialized = false;

/**
 * Ensures MongoDB is connected and seed data is loaded before handling a request.
 * Runs only once per server process lifetime.
 */
async function ensureInitialized() {
  if (!initialized) {
    await connectToMongoDB();
    await seedDatabase();
    initialized = true;
  }
}

/**
 * GET /api/listings
 * Search and filter property listings (sales or rentals).
 *
 * Query parameters:
 *   kind      {string}  Required. "sale" or "rental"
 *   state     {string}  Filter by state abbreviation (e.g. "NY")
 *   city      {string}  Filter by city name (case-insensitive partial match)
 *   status    {string}  Filter by listing status (e.g. "active")
 *   minPrice  {number}  Minimum price filter
 *   maxPrice  {number}  Maximum price filter
 *   beds      {number}  Minimum number of bedrooms
 *   baths     {number}  Minimum number of bathrooms
 *   sort      {string}  Sort order: price_asc | price_desc | beds_desc | baths_desc
 */
router.get("/", async (req, res) => {
  try {
    await ensureInitialized();
    
    const {
      kind,
      state,
      city,
      status,
      minPrice,
      maxPrice,
      beds,
      baths,
      sort = "price_asc"
    } = req.query;

    if (!kind || (kind !== "sale" && kind !== "rental")) {
      return res.status(400).json({ error: "kind must be sale or rental" });
    }

    const filter = { kind };

    if (state) filter.state = state.toUpperCase();
    if (city) filter.city = { $regex: new RegExp(city, "i") };
    if (status) filter.status = status;
    if (minPrice) filter.price = { ...filter.price, $gte: Number(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: Number(maxPrice) };
    if (beds) filter.bedrooms = { $gte: Number(beds) };
    if (baths) filter.bathrooms = { $gte: Number(baths) };

    const sortMap = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      beds_desc: { bedrooms: -1 },
      baths_desc: { bathrooms: -1 }
    };

    const sortOption = sortMap[sort] || sortMap.price_asc;

    const listings = await mongo.listings()
      .find(filter)
      .project({
        id: 1, kind: 1, type: 1, city: 1, state: 1, address: 1, 
        description: 1, image_url: 1, status: 1, price: 1, 
        bedrooms: 1, bathrooms: 1, sqft: 1, year_built: 1
      })
      .sort(sortOption)
      .toArray();

    res.json({ count: listings.length, listings });
  } catch (error) {
    console.error("Listings error:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

/**
 * GET /api/listings/map
 * Returns only the fields needed for map marker rendering (lat, lng, price, etc.).
 * Only returns active listings that have geographic coordinates.
 * Public endpoint — no authentication required.
 */
router.get("/map", async (req, res) => {
  try {
    await ensureInitialized();
    
    const { kind } = req.query;

    if (kind && kind !== "sale" && kind !== "rental") {
      return res.status(400).json({ error: "kind must be sale or rental" });
    }

    const mapFilter = {
      status: "active",
      lat: { $ne: null },
      lng: { $ne: null }
    };
    if (kind) mapFilter.kind = kind;

    const listings = await mongo.listings()
      .find(mapFilter)
      .project({
        id: 1, kind: 1, city: 1, state: 1, price: 1, lat: 1, lng: 1,
        type: 1, bedrooms: 1, bathrooms: 1, address: 1, sqft: 1
      })
      .sort({ price: -1 })
      .toArray();

    res.json({ 
      count: listings.length, 
      kind,
      listings
    });
  } catch (error) {
    console.error("Map listings error:", error);
    res.status(500).json({ error: "Failed to fetch map listings" });
  }
});

/**
 * GET /api/listings/:id
 * Returns the full detail document for a single listing by its string ID.
 * Public endpoint — no authentication required.
 */
router.get("/:id", async (req, res) => {
  try {
    await ensureInitialized();
    
    const listing = await mongo.listings().findOne({ id: req.params.id });

    if (!listing) return res.status(404).json({ error: "Listing not found" });
    res.json(listing);
  } catch (error) {
    console.error("Get listing error:", error);
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

export default router;
