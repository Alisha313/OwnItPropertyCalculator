import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isLambda = !!process.env.LAMBDA_TASK_ROOT;

const bundledDbFile = path.join(__dirname, "../ownit.sqlite");
const runtimeDbFile = isLambda ? "/tmp/ownit.sqlite" : bundledDbFile;
const schemaFile = path.join(__dirname, "../db/schema.sql");
const seedFile = path.join(__dirname, "../db/seed.sql");

// Locate sql.js WASM binary and load it directly (works in Lambda + local)
const require_ = createRequire(import.meta.url);
const sqlJsMainPath = require_.resolve("sql.js");
const wasmPath = path.join(path.dirname(sqlJsMainPath), "dist", "sql-wasm.wasm");

let wasmBinary;
if (fs.existsSync(wasmPath)) {
  wasmBinary = fs.readFileSync(wasmPath);
} else {
  // Fallback: try alongside the resolved main file
  const altPath = path.join(path.dirname(sqlJsMainPath), "sql-wasm.wasm");
  if (fs.existsSync(altPath)) {
    wasmBinary = fs.readFileSync(altPath);
  }
}

const SQL = await initSqlJs(wasmBinary ? { wasmBinary } : undefined);

// Load database from file or create empty
let sqlDb;
if (isLambda && !fs.existsSync(runtimeDbFile) && fs.existsSync(bundledDbFile)) {
  fs.copyFileSync(bundledDbFile, runtimeDbFile);
}

if (fs.existsSync(runtimeDbFile)) {
  const buffer = fs.readFileSync(runtimeDbFile);
  sqlDb = new SQL.Database(buffer);
} else {
  sqlDb = new SQL.Database();
}

function persistDatabase() {
  const data = sqlDb.export();
  fs.writeFileSync(runtimeDbFile, Buffer.from(data));
}

/**
 * Wrapper that provides a better-sqlite3-compatible API over sql.js.
 * This lets all existing route files work without any changes.
 */
export const db = {
  prepare(sql) {
    return {
      get(...params) {
        const stmt = sqlDb.prepare(sql);
        try {
          if (params.length > 0) stmt.bind(params);
          return stmt.step() ? stmt.getAsObject() : undefined;
        } finally {
          stmt.free();
        }
      },
      all(...params) {
        const results = [];
        const stmt = sqlDb.prepare(sql);
        try {
          if (params.length > 0) stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
        } finally {
          stmt.free();
        }
        return results;
      },
      run(...params) {
        sqlDb.run(sql, params);
        const lastRow = sqlDb.exec("SELECT last_insert_rowid() AS id");
        const lastInsertRowid = lastRow.length > 0 ? lastRow[0].values[0][0] : 0;
        const changes = sqlDb.getRowsModified();
        persistDatabase();
        return { changes, lastInsertRowid };
      }
    };
  },

  exec(sql) {
    sqlDb.exec(sql);
    persistDatabase();
  }
};

export function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, "utf-8");
  db.exec(sql);
}

export function initDb() {
  // Check if tables already exist (e.g. if the DB was loaded from ownit.sqlite)
  // We check for the 'users' table specifically.
  const stmt = sqlDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
  const hasUsersTable = stmt.step();
  stmt.free();

  if (!hasUsersTable) {
    console.log("Database is empty, initializing schema and seed data...");
    runSqlFile(schemaFile);
    runSqlFile(seedFile);
    persistDatabase();
  } else {
    console.log("Database already initialized, skipping schema and seed.");
  }
}

// Allow: node src/db.js --reset
if (process.argv.includes("--reset")) {
  console.log("🧹 Resetting DB...");
  initDb();
  console.log("DB reset complete.");
}
