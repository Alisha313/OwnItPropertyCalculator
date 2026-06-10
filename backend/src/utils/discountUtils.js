/**
 * Shared discount helpers for customer and agent listing APIs.
 */

/**
 * Returns true if a discount document is still active (not expired).
 * @param {{ expires_at?: string|null }} discount
 * @param {Date|string} [now]
 */
export function isDiscountActive(discount, now = new Date()) {
  if (!discount) return false;
  if (!discount.expires_at) return true;
  return new Date(discount.expires_at) > now;
}

/**
 * Computes the discounted display price from list price and discount terms.
 * @param {number} listPrice
 * @param {{ type: string, amount: number }} discount
 */
export function computeDiscountedPrice(listPrice, discount) {
  if (discount.type === "percent") {
    return Math.round(listPrice * (1 - discount.amount / 100));
  }
  return Math.max(0, listPrice - discount.amount);
}

/**
 * Mutates a listing object to apply an active discount for API responses.
 * Sets original_price, discount metadata, and the display price.
 * @param {object} listing
 * @param {object|null} discount - Raw discount document from MongoDB
 * @param {{ includeDiscountMeta?: boolean }} [options]
 */
export function applyActiveDiscount(listing, discount, options = {}) {
  const { includeDiscountMeta = true } = options;
  if (!discount || !isDiscountActive(discount)) return listing;

  listing.original_price = listing.price;
  if (includeDiscountMeta) {
    listing.discount = {
      type: discount.type,
      amount: discount.amount,
      expires_at: discount.expires_at ?? null,
    };
  }
  listing.price = computeDiscountedPrice(listing.price, discount);
  return listing;
}

/**
 * Builds a listing_id → discount map from discount documents, skipping expired ones.
 * @param {Array<object>} discounts
 */
export function buildActiveDiscountMap(discounts) {
  const now = new Date();
  const map = {};
  for (const d of discounts) {
    if (isDiscountActive(d, now)) map[d.listing_id] = d;
  }
  return map;
}

/**
 * MongoDB filter for non-expired discounts.
 * @param {string[]} [listingIds]
 */
export function activeDiscountFilter(listingIds) {
  const now = new Date().toISOString();
  const filter = {
    $or: [{ expires_at: null }, { expires_at: { $gt: now } }],
  };
  if (listingIds?.length) filter.listing_id = { $in: listingIds };
  return filter;
}
