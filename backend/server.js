/**
 * @file server.js
 * @project OwnIt Property Calculator
 * @description Entry point for the Node.js/Express backend server.
 *              Reads the PORT environment variable, creates an HTTP server
 *              from the Express app, and automatically falls back to the
 *              next available port if the requested one is already in use.
 */

import dotenv from "dotenv";
dotenv.config(); // Load .env variables (PORT, JWT_SECRET, MONGODB_URI, etc.)

import http from "node:http";
import app from "./src/app.js";

// Use the PORT env variable if set; default to 3000 for local development
const configuredPort = Number.parseInt(process.env.PORT ?? "", 10);
const defaultPort = Number.isNaN(configuredPort) ? 3000 : configuredPort;

/**
 * Creates and starts the HTTP server on the given port.
 * @param {number} port - The port number to listen on.
 * @param {boolean} allowFallback - If true, retry on port+1 when port is busy.
 */
function startServer(port, allowFallback) {
  const server = http.createServer(app);

  server.on("error", (error) => {
    // EADDRINUSE means the port is already occupied by another process
    if (error.code === "EADDRINUSE" && allowFallback) {
      const fallbackPort = port + 1;
      console.warn(
        `⚠️ Port ${port} is in use. Retrying on http://localhost:${fallbackPort}`
      );
      startServer(fallbackPort, false);
      return;
    }

    console.error("❌ Failed to start backend server:", error.message);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`✅ OwnIt backend running on http://localhost:${port}`);
  });
}

// Start the server — allow one automatic port fallback
startServer(defaultPort, true);
