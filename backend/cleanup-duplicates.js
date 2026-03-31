/**
 * cleanup-duplicates.js
 * Run once to wipe all existing listings and reseed cleanly.
 * Usage: node cleanup-duplicates.js
 */
import { connectToMongoDB, getDb, closeMongoDB, seedDatabase } from "./src/db/mongo.js";

(async () => {
  try {
    await connectToMongoDB();
    const db = getDb();

    // Wipe all seeded collections so seedDatabase() starts fresh
    const listingsDel  = await db.collection("listings").deleteMany({});
    const plansDel     = await db.collection("subscription_plans").deleteMany({});
    const trendsDel    = await db.collection("market_trends").deleteMany({});

    console.log(`🗑  Cleared ${listingsDel.deletedCount} listings`);
    console.log(`🗑  Cleared ${plansDel.deletedCount} subscription plans`);
    console.log(`🗑  Cleared ${trendsDel.deletedCount} market trends`);

    // Reseed with the clean 100-listing dataset
    await seedDatabase();

    const count = await db.collection("listings").countDocuments();
    console.log(`\n✅ Done — ${count} listings now in the database.`);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await closeMongoDB();
  }
})();
