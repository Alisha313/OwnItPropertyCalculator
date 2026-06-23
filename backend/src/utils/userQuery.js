/**
 * Normalize user IDs for MongoDB queries.
 * Subscriptions are stored with ObjectId user_id; JWT carries a string id.
 */
import { getObjectId } from "../db/mongo.js";

/** Prefer ObjectId when valid; used when writing user_id fields. */
export function resolveUserId(userId) {
  return getObjectId(userId) ?? userId;
}

/** Match user_id whether stored as ObjectId or string. */
export function userIdQuery(userId) {
  const oid = getObjectId(userId);
  if (!oid) return { user_id: userId };
  return { user_id: { $in: [oid, String(userId)] } };
}
