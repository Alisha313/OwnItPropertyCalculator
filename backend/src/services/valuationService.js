/**
 * @file valuationService.js
 * @project OwnIt Property Calculator
 * @description Shared rules-based property valuation logic. Estimates a value
 *              from price-per-sqft data (market trends, local comps, or state
 *              average), then adjusts for bedrooms, bathrooms, and age.
 *              Used by both the listing valuation endpoint and the homeowner
 *              "What's My Home Worth?" endpoint.
 */

import { mongo } from "../db/mongo.js";

/** Escapes a string for safe use inside a RegExp. */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ciExact(value) {
  return { $regex: new RegExp(`^${escapeRegex(value)}$`, "i") };
}

/**
 * Resolves the average price per square foot for an area, preferring market
 * trend data, then local comparable listings, then a state-wide average.
 * @returns {Promise<{ avgPricePerSqft: number, dataSource: string }|null>}
 */
async function resolveAvgPricePerSqft({ city, state, kind }) {
  const marketData = await mongo.market_trends().findOne(
    { city: ciExact(city), state: ciExact(state) },
    { sort: { year: -1, quarter: -1 } }
  );

  if (marketData) {
    return { avgPricePerSqft: marketData.price_per_sqft, dataSource: "market_trends" };
  }

  const localComps = await mongo.listings()
    .find({ city: ciExact(city), state: ciExact(state), sqft: { $exists: true, $gt: 0 }, kind })
    .limit(10)
    .toArray();

  if (localComps.length > 0) {
    const totalPpsf = localComps.reduce((sum, c) => sum + c.price / c.sqft, 0);
    return { avgPricePerSqft: totalPpsf / localComps.length, dataSource: "local_comparables" };
  }

  const stateComps = await mongo.listings()
    .find({ state: ciExact(state), sqft: { $exists: true, $gt: 0 }, kind })
    .limit(20)
    .toArray();

  if (stateComps.length > 0) {
    const totalPpsf = stateComps.reduce((sum, c) => sum + c.price / c.sqft, 0);
    return { avgPricePerSqft: totalPpsf / stateComps.length, dataSource: "state_average" };
  }

  return null;
}

/**
 * Applies bedroom, bathroom, and age adjustments to a base value.
 * @returns {{ value: number, adjustments: Array<object> }}
 */
function applyAdjustments(baseValue, { bedrooms, bathrooms, year_built }) {
  let value = baseValue;
  const adjustments = [];

  if (typeof bedrooms === "number" && !Number.isNaN(bedrooms)) {
    const bedroomDiff = bedrooms - 2;
    if (bedroomDiff !== 0) {
      const bedroomAdj = bedroomDiff * 0.02;
      value *= 1 + bedroomAdj;
      adjustments.push({
        factor: "bedrooms",
        description: `${bedroomDiff > 0 ? "+" : ""}${bedroomDiff} bedroom${Math.abs(bedroomDiff) !== 1 ? "s" : ""} vs baseline`,
        percent: bedroomAdj * 100,
      });
    }
  }

  if (typeof bathrooms === "number" && !Number.isNaN(bathrooms)) {
    const bathroomDiff = bathrooms - 2;
    if (bathroomDiff !== 0) {
      const bathroomAdj = bathroomDiff * 0.015;
      value *= 1 + bathroomAdj;
      adjustments.push({
        factor: "bathrooms",
        description: `${bathroomDiff > 0 ? "+" : ""}${bathroomDiff} bathroom${Math.abs(bathroomDiff) !== 1 ? "s" : ""} vs baseline`,
        percent: bathroomAdj * 100,
      });
    }
  }

  if (year_built) {
    const age = new Date().getFullYear() - year_built;
    if (age > 20) {
      const ageAdj = Math.max((age - 20) * -0.003, -0.15); // Max -15% penalty
      value *= 1 + ageAdj;
      adjustments.push({
        factor: "age",
        description: `Property is ${age} years old`,
        percent: ageAdj * 100,
      });
    }
  }

  return { value, adjustments };
}

function mapListingToComp(c) {
  return {
    id: c.id,
    address: c.address,
    city: c.city,
    state: c.state,
    price: c.price,
    sqft: c.sqft,
    bedrooms: c.bedrooms ?? null,
    bathrooms: c.bathrooms ?? null,
    pricePerSqft: Math.round(c.price / c.sqft),
    type: c.type || null,
  };
}

function sortBySqftSimilarity(listings, sqft) {
  if (typeof sqft === "number" && sqft > 0) {
    listings.sort((a, b) => Math.abs(a.sqft - sqft) - Math.abs(b.sqft - sqft));
  } else {
    listings.sort((a, b) => a.sqft - b.sqft);
  }
  return listings;
}

/**
 * Fetches comparable listings — city first, then state-wide fallback.
 */
async function getComps({ city, state, kind, sqft, excludeId, limit = 5 }) {
  const baseFilter = { sqft: { $exists: true, $gt: 0 }, kind, status: "active" };
  if (excludeId) baseFilter.id = { $ne: excludeId };

  let scope = "city";
  let listings = await mongo.listings()
    .find({ ...baseFilter, city: ciExact(city), state: ciExact(state) })
    .limit(50)
    .toArray();

  if (listings.length === 0) {
    scope = "state";
    listings = await mongo.listings()
      .find({ ...baseFilter, state: ciExact(state) })
      .limit(50)
      .toArray();
  }

  sortBySqftSimilarity(listings, sqft);
  return {
    scope,
    comps: listings.slice(0, limit).map(mapListingToComp),
  };
}

/**
 * Computes summary statistics — city first, then state-wide fallback.
 */
async function computeStatsFromListings(listings) {
  if (listings.length === 0) {
    return { listingCount: 0, medianPricePerSqft: null, avgPricePerSqft: null, avgDaysOnMarket: null, minPrice: null, maxPrice: null };
  }

  const ppsfValues = listings.map((l) => l.price / l.sqft).sort((a, b) => a - b);
  const mid = Math.floor(ppsfValues.length / 2);
  const medianPricePerSqft = Math.round(
    ppsfValues.length % 2 === 0 ? (ppsfValues[mid - 1] + ppsfValues[mid]) / 2 : ppsfValues[mid]
  );
  const avgPricePerSqft = Math.round(ppsfValues.reduce((s, v) => s + v, 0) / ppsfValues.length);
  const prices = listings.map((l) => l.price).sort((a, b) => a - b);

  const now = Date.now();
  const domValues = listings
    .map((l) => l.created_at && Math.floor((now - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24)))
    .filter((d) => typeof d === "number" && d >= 0);
  const avgDaysOnMarket = domValues.length
    ? Math.round(domValues.reduce((sum, d) => sum + d, 0) / domValues.length)
    : null;

  return {
    listingCount: listings.length,
    medianPricePerSqft,
    avgPricePerSqft,
    avgDaysOnMarket,
    minPrice: prices[0],
    maxPrice: prices[prices.length - 1],
  };
}

async function getAreaStats({ city, state, kind }) {
  let scope = "city";
  let listings = await mongo.listings()
    .find({ city: ciExact(city), state: ciExact(state), kind, status: "active", sqft: { $exists: true, $gt: 0 } })
    .toArray();

  if (listings.length === 0) {
    scope = "state";
    listings = await mongo.listings()
      .find({ state: ciExact(state), kind, status: "active", sqft: { $exists: true, $gt: 0 } })
      .toArray();
  }

  return { scope, ...await computeStatsFromListings(listings) };
}

/** Nearby metro used when a state has no seeded trend rows. */
const REGIONAL_BENCHMARKS = {
  NJ: { city: "New York", state: "NY", label: "New York metro (regional benchmark)" },
  CT: { city: "New York", state: "NY", label: "New York metro (regional benchmark)" },
  DE: { city: "New York", state: "NY", label: "Northeast metro (regional benchmark)" },
  MD: { city: "New York", state: "NY", label: "Northeast metro (regional benchmark)" },
  VA: { city: "Atlanta", state: "GA", label: "Southeast metro (regional benchmark)" },
  PA: { city: "New York", state: "NY", label: "Northeast metro (regional benchmark)" },
  IN: { city: "Chicago", state: "IL", label: "Chicago metro (regional benchmark)" },
  WI: { city: "Chicago", state: "IL", label: "Chicago metro (regional benchmark)" },
  NV: { city: "Los Angeles", state: "CA", label: "Los Angeles metro (regional benchmark)" },
  OR: { city: "Seattle", state: "WA", label: "Seattle metro (regional benchmark)" },
};

async function fetchTrendSeries(city, state) {
  return mongo.market_trends()
    .find({ city: ciExact(city), state: ciExact(state) })
    .sort({ year: 1, quarter: 1 })
    .toArray();
}

async function getMarketTrend({ city, state }) {
  let trends = await fetchTrendSeries(city, state);
  let scope = "city";
  let label = `${city}, ${state}`;

  if (trends.length === 0) {
    trends = await mongo.market_trends()
      .find({ state: ciExact(state) })
      .sort({ year: 1, quarter: 1 })
      .toArray();
    if (trends.length > 0) {
      scope = "state";
      label = `${state} statewide average`;
    }
  }

  if (trends.length === 0) {
    const bench = REGIONAL_BENCHMARKS[state.toUpperCase()];
    if (bench) {
      trends = await fetchTrendSeries(bench.city, bench.state);
      if (trends.length > 0) {
        scope = "regional";
        label = bench.label;
      }
    }
  }

  if (trends.length === 0) return { available: false, scope: "none", series: [], summary: null, label: null };

  const series = trends.slice(-8).map((t) => ({
    quarter: t.quarter,
    year: t.year,
    pricePerSqft: Math.round(t.price_per_sqft),
    label: `Q${t.quarter} ${t.year}`,
  }));

  const firstPrice = series[0].pricePerSqft;
  const lastPrice = series[series.length - 1].pricePerSqft;
  const growthPercent = firstPrice ? parseFloat(((lastPrice - firstPrice) / firstPrice * 100).toFixed(1)) : 0;

  return {
    available: true,
    scope,
    label,
    series,
    summary: {
      startPrice: firstPrice,
      endPrice: lastPrice,
      growthPercent,
      trend: growthPercent > 0 ? "up" : growthPercent < 0 ? "down" : "stable",
    },
  };
}

const DATA_SOURCE_LABELS = {
  market_trends: "Official market trend data",
  local_comparables: "Recent sales in your city",
  state_average: "Statewide sale averages",
};

/**
 * Estimates a property's value from its attributes and area data.
 *
 * @param {object} input
 * @param {string} input.city
 * @param {string} input.state
 * @param {number} input.sqft
 * @param {number} [input.bedrooms]
 * @param {number} [input.bathrooms]
 * @param {number} [input.year_built]
 * @param {string} [input.kind="sale"]
 * @param {string} [input.type="home"]
 * @param {string} [input.excludeId] - Listing id to exclude from comps
 * @returns {Promise<object|null>} Estimate details, or null if no comparable data.
 */
export async function estimatePropertyValue(input) {
  const {
    city,
    state,
    sqft,
    bedrooms,
    bathrooms,
    year_built,
    kind = "sale",
    type = "home",
    excludeId,
  } = input;

  const ppsf = await resolveAvgPricePerSqft({ city, state, kind });
  if (!ppsf) return null;

  const { avgPricePerSqft, dataSource } = ppsf;
  const baseValue = sqft * avgPricePerSqft;
  const { value, adjustments } = applyAdjustments(baseValue, { bedrooms, bathrooms, year_built });

  const estimatedValue = Math.round(value / 1000) * 1000;
  const valueRange = {
    low: Math.round((estimatedValue * 0.92) / 1000) * 1000,
    high: Math.round((estimatedValue * 1.08) / 1000) * 1000,
  };

  const confidence =
    dataSource === "market_trends" ? "high" : dataSource === "local_comparables" ? "medium" : "low";

  const isRental = kind === "rental";
  const priceLabel = isRental ? "rent" : "value";
  let explanation = `Based on ${isRental ? "rental" : "market"} data for ${city}, ${state}, `;
  explanation += `the average price per square foot is $${Math.round(avgPricePerSqft)}/sqft. `;
  explanation += `For this ${Number(sqft).toLocaleString()} sqft ${String(type).toLowerCase()}, `;
  explanation += `the base ${priceLabel} would be $${Math.round(baseValue).toLocaleString()}. `;
  if (adjustments.length > 0) {
    explanation += `After adjusting for ${adjustments.map((a) => a.factor).join(", ")}, `;
  }
  explanation += `the estimated ${priceLabel} is $${estimatedValue.toLocaleString()}.`;

  const [{ comps, scope: compsScope }, areaStats, marketTrend] = await Promise.all([
    getComps({ city, state, kind, sqft, excludeId }),
    getAreaStats({ city, state, kind }),
    getMarketTrend({ city, state }),
  ]);

  const yourPricePerSqft = Math.round(estimatedValue / sqft);

  return {
    estimatedValue,
    valueRange,
    baseValue: Math.round(baseValue),
    avgPricePerSqft: Math.round(avgPricePerSqft),
    yourPricePerSqft,
    sqft,
    confidence,
    dataSource,
    dataSourceLabel: DATA_SOURCE_LABELS[dataSource] || dataSource,
    adjustments,
    explanation,
    comps,
    compsScope,
    areaStats,
    marketTrend,
    property: { city, state, type, bedrooms, bathrooms, year_built },
  };
}
