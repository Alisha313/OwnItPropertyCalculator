import { MongoClient, ObjectId } from "mongodb";

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://paalisha_db_user:LMaGOVJw0vABFc24@ownit.2yfj4f1.mongodb.net/?appName=ownit";

let client = null;
let db = null;

export async function connectToMongoDB() {
  if (db) return db;
  
  try {
    client = new MongoClient(MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 1,
    });
    
    await client.connect();
    db = client.db("ownit");
    
    // Create indexes
    await createIndexes();
    
    console.log("Connected to MongoDB Atlas");
    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

async function createIndexes() {
  // Users - email unique
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  
  // Listings indexes
  await db.collection("listings").createIndex({ kind: 1 });
  await db.collection("listings").createIndex({ city: 1 });
  await db.collection("listings").createIndex({ state: 1 });
  await db.collection("listings").createIndex({ price: 1 });
  
  // Subscriptions indexes
  await db.collection("subscriptions").createIndex({ user_id: 1 });
  await db.collection("subscriptions").createIndex({ status: 1 });
  
  // Chat sessions indexes
  await db.collection("chat_sessions").createIndex({ user_id: 1 });
  await db.collection("chat_messages").createIndex({ session_id: 1 });
  
  // Market trends indexes
  await db.collection("market_trends").createIndex({ city: 1, state: 1 });
  await db.collection("market_trends").createIndex({ year: 1 });
  
  // Saved properties indexes
  await db.collection("saved_properties").createIndex({ user_id: 1 });
  
  console.log("MongoDB indexes created");
}

export function getDb() {
  if (!db) throw new Error("MongoDB not connected. Call connectToMongoDB() first.");
  return db;
}

export function getObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// Helper to convert MongoDB documents to match old SQLite API
export const mongo = {
  users: () => getDb().collection("users"),
  listings: () => getDb().collection("listings"),
  subscription_plans: () => getDb().collection("subscription_plans"),
  subscriptions: () => getDb().collection("subscriptions"),
  email_reminders: () => getDb().collection("email_reminders"),
  agent_requests: () => getDb().collection("agent_requests"),
  chat_sessions: () => getDb().collection("chat_sessions"),
  chat_messages: () => getDb().collection("chat_messages"),
  market_trends: () => getDb().collection("market_trends"),
  saved_properties: () => getDb().collection("saved_properties"),
};

// Seed data for initial population
export async function seedDatabase() {
  const db = getDb();
  
  // Check if already seeded
  const existingUsers = await db.collection("users").countDocuments();
  if (existingUsers > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }
  
  console.log("Seeding database with initial data...");
  
  // Seed subscription plans
  await db.collection("subscription_plans").insertMany([
    { name: "Basic", billing_cycle: "monthly", price: 9.99, features: ["Basic property search", "5 saved properties", "Email support"] },
    { name: "Pro", billing_cycle: "monthly", price: 19.99, features: ["Advanced property search", "Unlimited saved properties", "AI assistant access", "Priority support"] },
    { name: "Annual Basic", billing_cycle: "annually", price: 99.99, features: ["Basic property search", "5 saved properties", "Email support"] },
    { name: "Annual Pro", billing_cycle: "annually", price: 199.99, features: ["Advanced property search", "Unlimited saved properties", "AI assistant access", "Priority support"] },
  ]);
  
  // Seed market trends
  const marketTrends = [];
  const cities = [
    { city: "New York", state: "NY" },
    { city: "Los Angeles", state: "CA" },
    { city: "Chicago", state: "IL" },
    { city: "Houston", state: "TX" },
    { city: "Miami", state: "FL" },
    { city: "Seattle", state: "WA" },
    { city: "Denver", state: "CO" },
    { city: "Phoenix", state: "AZ" },
    { city: "Atlanta", state: "GA" },
    { city: "Boston", state: "MA" },
    { city: "San Francisco", state: "CA" },
    { city: "Austin", state: "TX" },
  ];
  
  const basePrices = { "NY": 450, "CA": 380, "IL": 180, "TX": 160, "FL": 250, "WA": 300, "CO": 280, "AZ": 200, "GA": 190, "MA": 360 };
  
  for (const { city, state } of cities) {
    const basePrice = basePrices[state] || 200;
    for (let year = 2022; year <= 2025; year++) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        const variance = 1 + (Math.random() * 0.2 - 0.1);
        marketTrends.push({
          city,
          state,
          quarter,
          year,
          price_per_sqft: Math.round(basePrice * variance),
        });
      }
    }
  }
  await db.collection("market_trends").insertMany(marketTrends);
  
  // Seed listings
  const listings = [
    { id: "list_001", kind: "sale", type: "Single Family", city: "New York", state: "NY", address: "123 Manhattan Ave", description: "Beautiful brownstone in Manhattan with classic brick facade and modern interiors", image_url: "https://images.unsplash.com/photo-1625602812206-5ec545ca1231?w=800&q=80", status: "active", price: 850000, bedrooms: 2, bathrooms: 2, sqft: 1200, year_built: 2018, lat: 40.7128, lng: -74.006 },
    { id: "list_002", kind: "sale", type: "Condo", city: "Los Angeles", state: "CA", address: "456 Sunset Blvd", description: "Modern condo with ocean view and open-concept floor plan", image_url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80", status: "active", price: 1250000, bedrooms: 3, bathrooms: 2, sqft: 1800, year_built: 2020, lat: 34.0522, lng: -118.2437 },
    { id: "list_003", kind: "sale", type: "Townhouse", city: "Austin", state: "TX", address: "789 Congress Ave", description: "Charming two-story townhouse near downtown Austin with covered porch", image_url: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80", status: "active", price: 425000, bedrooms: 3, bathrooms: 2.5, sqft: 1650, year_built: 2019, lat: 30.2672, lng: -97.7431 },
    { id: "list_004", kind: "sale", type: "Single Family", city: "Miami", state: "FL", address: "321 Ocean Dr", description: "Stunning waterfront estate with pool and tropical landscaping", image_url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80", status: "active", price: 1875000, bedrooms: 4, bathrooms: 3, sqft: 2800, year_built: 2021, lat: 25.7617, lng: -80.1918 },
    { id: "list_005", kind: "sale", type: "Condo", city: "Seattle", state: "WA", address: "555 Pike St", description: "Contemporary condo with floor-to-ceiling windows and city views", image_url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80", status: "active", price: 695000, bedrooms: 2, bathrooms: 2, sqft: 1100, year_built: 2022, lat: 47.6062, lng: -122.3321 },
    { id: "list_006", kind: "rental", type: "Apartment", city: "New York", state: "NY", address: "100 Park Ave", description: "Cozy studio apartment in midtown with hardwood floors", image_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80", status: "active", price: 2800, bedrooms: 1, bathrooms: 1, sqft: 650, year_built: 2015, lat: 40.7527, lng: -73.9772 },
    { id: "list_007", kind: "rental", type: "House", city: "Austin", state: "TX", address: "222 Riverside Dr", description: "Spacious ranch-style house with large backyard and mature trees", image_url: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80", status: "active", price: 2200, bedrooms: 3, bathrooms: 2, sqft: 1400, year_built: 2017, lat: 30.3074, lng: -97.7533 },
    { id: "list_008", kind: "rental", type: "Condo", city: "Miami", state: "FL", address: "888 Brickell Ave", description: "Luxury high-rise condo in Brickell with resort-style pool", image_url: "https://images.unsplash.com/photo-1567684014761-b65e2e59b9eb?w=800&q=80", status: "active", price: 3500, bedrooms: 2, bathrooms: 2, sqft: 1350, year_built: 2023, lat: 25.7589, lng: -80.1916 },
    { id: "list_009", kind: "rental", type: "Apartment", city: "Denver", state: "CO", address: "1500 Main St", description: "Modern loft-style apartment near LoDo with mountain views", image_url: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&q=80", status: "active", price: 1800, bedrooms: 1, bathrooms: 1, sqft: 750, year_built: 2020, lat: 39.7392, lng: -104.9903 },
    { id: "list_010", kind: "rental", type: "Townhouse", city: "Phoenix", state: "AZ", address: "450 Camelback Rd", description: "Southwest-style townhouse with private pool and desert views", image_url: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800&q=80", status: "active", price: 1950, bedrooms: 2, bathrooms: 2, sqft: 1200, year_built: 2018, lat: 33.4484, lng: -112.074 },
  ];
  
  await db.collection("listings").insertMany(listings);
  
  console.log("Database seeded successfully!");
}

// Graceful shutdown
export async function closeMongoDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("MongoDB connection closed");
  }
}
