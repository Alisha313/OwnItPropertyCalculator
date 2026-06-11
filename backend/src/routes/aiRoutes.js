/**
 * @file aiRoutes.js
 * @project OwnIt Property Calculator
 * @description Rules-based AI valuation and market trend endpoints.
 *              Property value estimates are calculated using price-per-sqft
 *              data from market trends or comparable listings, then adjusted
 *              for bedrooms, bathrooms, and property age.
 *
 * Endpoints:
 *   GET  /api/ai/valuation?listingId=        - Estimated value for a listing
 *   GET  /api/ai/market-trends?city=&state=  - Historical market trend data
 *   POST /api/ai/home-value                  - Estimate value from homeowner inputs
 *   POST /api/ai/home-value/request-agent    - Seller lead for a listing valuation
 */

import express from "express";
import { mongo, connectToMongoDB, seedDatabase } from "../db/mongo.js";
import { authenticateToken } from "./authRoutes.js";
import { estimatePropertyValue } from "../services/valuationService.js";

const router = express.Router();

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await connectToMongoDB();
    await seedDatabase();
    initialized = true;
  }
}

/**
 * GET /api/ai/valuation?listingId=123
 * Returns AI-powered (rules-based) property value estimate
 * Public endpoint - no auth required
 */
router.get("/valuation", async (req, res) => {
  try {
    await ensureInitialized();
    
    const { listingId } = req.query;

    if (!listingId) {
      return res.status(400).json({ error: "listingId is required" });
    }

    // Get the listing
    const listing = await mongo.listings().findOne({ id: listingId });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    if (!listing.sqft) {
      return res.status(400).json({ 
        error: "Cannot estimate value - listing has no square footage data" 
      });
    }

    const estimate = await estimatePropertyValue({
      city: listing.city,
      state: listing.state,
      sqft: listing.sqft,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      year_built: listing.year_built,
      kind: listing.kind,
      type: listing.type,
      excludeId: listing.id,
    });

    if (!estimate) {
      return res.status(400).json({ error: "Not enough comparable data to estimate value" });
    }

    res.json({
      listingId: listing.id,
      estimatedValue: estimate.estimatedValue,
      listedPrice: listing.price,
      difference: estimate.estimatedValue - listing.price,
      differencePercent: ((estimate.estimatedValue - listing.price) / listing.price * 100).toFixed(1),
      avgPricePerSqft: estimate.avgPricePerSqft,
      sqft: estimate.sqft,
      confidence: estimate.confidence,
      dataSource: estimate.dataSource,
      adjustments: estimate.adjustments,
      explanation: estimate.explanation,
      compsUsed: estimate.comps,
    });
  } catch (error) {
    console.error("Valuation error:", error);
    res.status(500).json({ error: "Failed to get valuation" });
  }
});

/**
 * GET /api/ai/market-trends?city=Edison&state=NJ
 * Returns historical market trend data for the city
 * Public endpoint - no auth required
 */
router.get("/market-trends", async (req, res) => {
  try {
    await ensureInitialized();
    
    const { city, state } = req.query;

    if (!city || !state) {
      return res.status(400).json({ error: "city and state are required" });
    }

    // Get market trends for this city
    const trends = await mongo.market_trends()
      .find({
        city: { $regex: new RegExp(`^${city}$`, "i") },
        state: { $regex: new RegExp(`^${state}$`, "i") }
      })
      .sort({ year: 1, quarter: 1 })
      .toArray();

    if (trends.length === 0) {
      // Try to get state-level data as fallback
      const stateTrends = await mongo.market_trends()
        .find({
          state: { $regex: new RegExp(`^${state}$`, "i") }
        })
        .sort({ year: 1, quarter: 1 })
        .toArray();

      if (stateTrends.length === 0) {
        return res.json({
          city,
          state,
          available: false,
          message: `No market trend data available for ${city}, ${state}`,
          series: []
        });
      }

      // Calculate summary stats
      const firstPrice = stateTrends[0].price_per_sqft;
      const lastPrice = stateTrends[stateTrends.length - 1].price_per_sqft;
      const growthPercent = ((lastPrice - firstPrice) / firstPrice * 100).toFixed(1);

      return res.json({
        city,
        state,
        available: true,
        isStateAverage: true,
        message: `Showing state average for ${state} (no city-specific data)`,
        series: stateTrends.map(t => ({
          quarter: t.quarter,
          year: t.year,
          pricePerSqft: Math.round(t.price_per_sqft),
          label: `Q${t.quarter} ${t.year}`
        })),
        summary: {
          startPrice: Math.round(firstPrice),
          endPrice: Math.round(lastPrice),
          growthPercent: parseFloat(growthPercent),
          trend: growthPercent > 0 ? "up" : growthPercent < 0 ? "down" : "stable"
        }
      });
    }

    // Calculate summary stats
    const firstPrice = trends[0].price_per_sqft;
    const lastPrice = trends[trends.length - 1].price_per_sqft;
    const growthPercent = ((lastPrice - firstPrice) / firstPrice * 100).toFixed(1);

    // Calculate YoY change for latest year
    const latestYear = trends[trends.length - 1].year;
    const latestYearTrends = trends.filter(t => t.year === latestYear);
    const prevYearTrends = trends.filter(t => t.year === latestYear - 1);
    
    let yoyChange = null;
    if (latestYearTrends.length > 0 && prevYearTrends.length > 0) {
      const latestAvg = latestYearTrends.reduce((sum, t) => sum + t.price_per_sqft, 0) / latestYearTrends.length;
      const prevAvg = prevYearTrends.reduce((sum, t) => sum + t.price_per_sqft, 0) / prevYearTrends.length;
      yoyChange = ((latestAvg - prevAvg) / prevAvg * 100).toFixed(1);
    }

    res.json({
      city,
      state,
      available: true,
      isStateAverage: false,
      series: trends.map(t => ({
        quarter: t.quarter,
        year: t.year,
        pricePerSqft: Math.round(t.price_per_sqft),
        label: `Q${t.quarter} ${t.year}`
      })),
      summary: {
        startPrice: Math.round(firstPrice),
        endPrice: Math.round(lastPrice),
        growthPercent: parseFloat(growthPercent),
        yoyChange: yoyChange ? parseFloat(yoyChange) : null,
        trend: growthPercent > 0 ? "up" : growthPercent < 0 ? "down" : "stable",
        dataPoints: trends.length
      }
    });
  } catch (error) {
    console.error("Market trends error:", error);
    res.status(500).json({ error: "Failed to get market trends" });
  }
});

/**
 * POST /api/ai/home-value
 * Estimates a home's value from homeowner-provided details (no listing needed).
 * Public endpoint - no auth required.
 *
 * Body: { address?, city, state, sqft, bedrooms?, bathrooms?, year_built?, property_type? }
 */
router.post("/home-value", async (req, res) => {
  try {
    await ensureInitialized();

    const { city, state, sqft, bedrooms, bathrooms, year_built, property_type } = req.body || {};

    if (!city || !state || !sqft) {
      return res.status(400).json({ error: "city, state, and sqft are required" });
    }

    const sqftNum = Number(sqft);
    if (Number.isNaN(sqftNum) || sqftNum <= 0) {
      return res.status(400).json({ error: "sqft must be a positive number" });
    }

    const estimate = await estimatePropertyValue({
      city: String(city).trim(),
      state: String(state).trim().toUpperCase(),
      sqft: sqftNum,
      bedrooms: bedrooms !== undefined && bedrooms !== "" ? Number(bedrooms) : undefined,
      bathrooms: bathrooms !== undefined && bathrooms !== "" ? Number(bathrooms) : undefined,
      year_built: year_built ? Number(year_built) : undefined,
      kind: "sale",
      type: property_type || "home",
    });

    if (!estimate) {
      return res.status(404).json({
        error: `We don't have enough nearby data for ${city}, ${state} yet. Connect with an agent for a full market analysis.`,
        available: false,
      });
    }

    res.json({ available: true, ...estimate });
  } catch (error) {
    console.error("Home value error:", error);
    res.status(500).json({ error: "Failed to estimate home value" });
  }
});

/**
 * POST /api/ai/home-value/request-agent
 * Creates a seller lead so an agent can follow up about listing the home.
 * Login required.
 *
 * Body: { property: {...}, estimatedValue?, message? }
 */
router.post("/home-value/request-agent", authenticateToken, async (req, res) => {
  try {
    await ensureInitialized();

    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { property, estimatedValue, message } = req.body || {};

    await mongo.leads().insertOne({
      user_id: req.user.id,
      user_name: req.user.name || "Unknown",
      user_email: req.user.email || "",
      source: "seller_valuation",
      source_listing_id: null,
      stage: "new",
      seller_property: property || null,
      seller_estimate: estimatedValue ?? null,
      message: message || "I'd like to talk to an agent about selling my home.",
      created_at: new Date().toISOString(),
    });

    res.json({
      ok: true,
      message: "Your request has been sent. An agent will reach out about listing your home soon!",
    });
  } catch (error) {
    console.error("Seller lead error:", error);
    res.status(500).json({ error: "Failed to submit request" });
  }
});

export default router;
