import dotenv from "dotenv";
dotenv.config();

import http from "node:http";
import app from "./src/app.js";

const configuredPort = Number.parseInt(process.env.PORT ?? "", 10);
const defaultPort = Number.isNaN(configuredPort) ? 3000 : configuredPort;

function startServer(port, allowFallback) {
  const server = http.createServer(app);

  server.on("error", (error) => {
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

startServer(defaultPort, true);
