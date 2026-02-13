import express from "express";
import { db } from "../db.js";

const router = express.Router();

/**
 * GET /api/ai/valuation?listingId=123
 * Returns AI-powered (rules-based) property value estimate
 * Public endpoint - no auth required
 */
router.get("/valuation", (req, res) => {
  const { listingId } = req.query;

  if (!listingId) {
    return res.status(400).json({ error: "listingId is required" });
  }

  // Get the listing
  const listing = db.prepare(`
    SELECT id, kind, type, city, state, price, bedrooms, bathrooms, sqft, year_built
    FROM listings WHERE id = ?
  `).get(listingId);

  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }

  if (!listing.sqft) {
    return res.status(400).json({ 
      error: "Cannot estimate value - listing has no square footage data" 
    });
  }

  // Get average price per sqft for this city/state from market trends (latest quarter)
  const marketData = db.prepare(`
    SELECT price_per_sqft FROM market_trends
    WHERE LOWER(city) = LOWER(?) AND LOWER(state) = LOWER(?)
    ORDER BY year DESC, quarter DESC
    LIMIT 1
  `).get(listing.city, listing.state);

  // If no market data, calculate from similar listings
  let avgPricePerSqft;
  let dataSource;
  
  if (marketData) {
    avgPricePerSqft = marketData.price_per_sqft;
    dataSource = "market_trends";
  } else {
    // Calculate from comparable listings in the same city/state
    const comps = db.prepare(`
      SELECT price, sqft FROM listings
      WHERE LOWER(city) = LOWER(?) AND LOWER(state) = LOWER(?)
        AND sqft IS NOT NULL AND sqft > 0 AND kind = ?
      LIMIT 10
    `).all(listing.city, listing.state, listing.kind);

    if (comps.length === 0) {
      // Fallback: use state-wide average
      const stateComps = db.prepare(`
        SELECT price, sqft FROM listings
        WHERE LOWER(state) = LOWER(?) AND sqft IS NOT NULL AND sqft > 0 AND kind = ?
        LIMIT 20
      `).all(listing.state, listing.kind);

      if (stateComps.length === 0) {
        return res.status(400).json({ 
          error: "Not enough comparable data to estimate value" 
        });
      }

      const totalPpsf = stateComps.reduce((sum, c) => sum + (c.price / c.sqft), 0);
      avgPricePerSqft = totalPpsf / stateComps.length;
      dataSource = "state_average";
    } else {
      const totalPpsf = comps.reduce((sum, c) => sum + (c.price / c.sqft), 0);
      avgPricePerSqft = totalPpsf / comps.length;
      dataSource = "local_comparables";
    }
  }

  // Base estimated value
  let estimatedValue = listing.sqft * avgPricePerSqft;

  // Adjustments based on property features
  const adjustments = [];

  // Bedroom adjustment: +2% per bedroom above 2, -2% per bedroom below 2
  const bedroomDiff = listing.bedrooms - 2;
  if (bedroomDiff !== 0) {
    const bedroomAdj = bedroomDiff * 0.02;
    estimatedValue *= (1 + bedroomAdj);
    adjustments.push({
      factor: "bedrooms",
      description: `${bedroomDiff > 0 ? '+' : ''}${bedroomDiff} bedroom${Math.abs(bedroomDiff) !== 1 ? 's' : ''} vs baseline`,
      percent: bedroomAdj * 100
    });
  }

  // Bathroom adjustment: +1.5% per bathroom above 2, -1.5% per bathroom below 2  
  const bathroomDiff = listing.bathrooms - 2;
  if (bathroomDiff !== 0) {
    const bathroomAdj = bathroomDiff * 0.015;
    estimatedValue *= (1 + bathroomAdj);
    adjustments.push({
      factor: "bathrooms",
      description: `${bathroomDiff > 0 ? '+' : ''}${bathroomDiff} bathroom${Math.abs(bathroomDiff) !== 1 ? 's' : ''} vs baseline`,
      percent: bathroomAdj * 100
    });
  }

  // Age adjustment: -0.3% per year for homes older than 20 years
  if (listing.year_built) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - listing.year_built;
    if (age > 20) {
      const ageAdj = Math.min((age - 20) * -0.003, -0.15); // Max -15% penalty
      estimatedValue *= (1 + ageAdj);
      adjustments.push({
        factor: "age",
        description: `Property is ${age} years old`,
        percent: ageAdj * 100
      });
    }
  }

  // Get comparable listings used
  const compsUsed = db.prepare(`
    SELECT id, address, city, state, price, sqft, bedrooms, bathrooms
    FROM listings
    WHERE LOWER(city) = LOWER(?) AND LOWER(state) = LOWER(?)
      AND sqft IS NOT NULL AND id != ? AND kind = ?
    ORDER BY ABS(sqft - ?) ASC
    LIMIT 3
  `).all(listing.city, listing.state, listing.id, listing.kind, listing.sqft);

  // Round to nearest $1000
  estimatedValue = Math.round(estimatedValue / 1000) * 1000;

  // Calculate confidence based on data source
  let confidence = dataSource === "market_trends" ? "high" : 
                   dataSource === "local_comparables" ? "medium" : "low";

  // Build explanation
  const isRental = listing.kind === "rental";
  const priceLabel = isRental ? "rent" : "value";
  
  let explanation = `Based on ${isRental ? 'rental' : 'market'} data for ${listing.city}, ${listing.state}, `;
  explanation += `the average price per square foot is $${Math.round(avgPricePerSqft)}/sqft. `;
  explanation += `For this ${listing.sqft.toLocaleString()} sqft ${listing.type.toLowerCase()}, `;
  explanation += `the base ${priceLabel} would be $${(listing.sqft * avgPricePerSqft).toLocaleString(undefined, {maximumFractionDigits: 0})}. `;
  
  if (adjustments.length > 0) {
    explanation += `After adjusting for ${adjustments.map(a => a.factor).join(', ')}, `;
  }
  explanation += `the estimated ${priceLabel} is $${estimatedValue.toLocaleString()}.`;

  res.json({
    listingId: listing.id,
    estimatedValue,
    listedPrice: listing.price,
    difference: estimatedValue - listing.price,
    differencePercent: ((estimatedValue - listing.price) / listing.price * 100).toFixed(1),
    avgPricePerSqft: Math.round(avgPricePerSqft),
    sqft: listing.sqft,
    confidence,
    dataSource,
    adjustments,
    explanation,
    compsUsed: compsUsed.map(c => ({
      id: c.id,
      address: c.address,
      city: c.city,
      state: c.state,
      price: c.price,
      sqft: c.sqft,
      pricePerSqft: Math.round(c.price / c.sqft)
    }))
  });
});

/**
 * GET /api/ai/market-trends?city=Edison&state=NJ
 * Returns historical market trend data for the city
 * Public endpoint - no auth required
 */
router.get("/market-trends", (req, res) => {
  const { city, state } = req.query;

  if (!city || !state) {
    return res.status(400).json({ error: "city and state are required" });
  }

  // Get market trends for this city
  const trends = db.prepare(`
    SELECT quarter, year, price_per_sqft
    FROM market_trends
    WHERE LOWER(city) = LOWER(?) AND LOWER(state) = LOWER(?)
    ORDER BY year ASC, quarter ASC
  `).all(city, state);

  if (trends.length === 0) {
    // Try to get state-level data as fallback
    const stateTrends = db.prepare(`
      SELECT quarter, year, AVG(price_per_sqft) as price_per_sqft
      FROM market_trends
      WHERE LOWER(state) = LOWER(?)
      GROUP BY year, quarter
      ORDER BY year ASC, quarter ASC
    `).all(state);

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
});

export default router;
