import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, "../ownit.sqlite");
const schemaFile = path.join(__dirname, "../db/schema.sql");
const seedFile = path.join(__dirname, "../db/seed.sql");

export const db = new Database(dbFile);

export function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, "utf-8");
  db.exec(sql);
}

export function initDb() {
  runSqlFile(schemaFile);
  runSqlFile(seedFile);
}

// Allow: node src/db.js --reset
if (process.argv.includes("--reset")) {
  console.log("🧹 Resetting DB...");
  // drop everything by deleting file contents isn't safe, but easiest is to drop tables in schema.sql
  initDb();
  console.log("✅ DB reset complete.");
}
