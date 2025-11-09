import { config } from "dotenv";
config();

import { createServer } from "http";
import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const server = createServer(createApp());

server.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "API ready");
});

const shutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, "Shutting down gracefully");
  server.close((err) => {
    if (err) {
      logger.error({ err }, "Error closing server");
      process.exit(1);
    }
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
