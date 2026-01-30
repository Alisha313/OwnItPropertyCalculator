import express from "express";
import { db, initDb } from "../db.js";

const router = express.Router();
initDb();

/**
 * GET /api/listings?kind=sale|rental&state=&city=&status=&minPrice=&maxPrice=&beds=&baths=&sort=
 * sort options: price_asc, price_desc, beds_desc, baths_desc
 */
router.get("/", (req, res) => {
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

  const where = ["kind = ?"];
  const params = [kind];

  if (state) {
    where.push("UPPER(state) = UPPER(?)");
    params.push(state);
  }
  if (city) {
    where.push("LOWER(city) LIKE LOWER(?)");
    params.push(`%${city}%`);
  }
  if (status) {
    where.push("status = ?");
    params.push(status);
  }
  if (minPrice) {
    where.push("price >= ?");
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    where.push("price <= ?");
    params.push(Number(maxPrice));
  }
  if (beds) {
    where.push("bedrooms >= ?");
    params.push(Number(beds));
  }
  if (baths) {
    where.push("bathrooms >= ?");
    params.push(Number(baths));
  }

  const sortMap = {
    price_asc: "price ASC",
    price_desc: "price DESC",
    beds_desc: "bedrooms DESC",
    baths_desc: "bathrooms DESC"
  };

  const orderBy = sortMap[sort] || sortMap.price_asc;

  const sql = `
    SELECT id, kind, type, city, state, address, description, image_url, status, price, bedrooms, bathrooms, sqft, year_built
    FROM listings
    WHERE ${where.join(" AND ")}
    ORDER BY ${orderBy}
  `;

  const rows = db.prepare(sql).all(...params);
  res.json({ count: rows.length, listings: rows });
});

router.get("/:id", (req, res) => {
  const row = db
    .prepare("SELECT id, kind, type, city, state, address, description, image_url, status, price, bedrooms, bathrooms, sqft, year_built FROM listings WHERE id = ?")
    .get(req.params.id);

  if (!row) return res.status(404).json({ error: "Listing not found" });
  res.json(row);
});

export default router;
