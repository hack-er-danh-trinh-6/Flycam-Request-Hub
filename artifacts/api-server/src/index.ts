import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  if (process.env["NODE_ENV"] === "production") {
    const PING_INTERVAL_MS = 14 * 60 * 1000;

    const externalUrl = process.env["RENDER_EXTERNAL_URL"];
    const pingUrl = externalUrl
      ? `${externalUrl}/api/healthz`
      : `http://localhost:${port}/api/healthz`;

    logger.info({ pingUrl, intervalMinutes: 14 }, "Anti-spin-down self-ping enabled");

    setInterval(async () => {
      try {
        const res = await fetch(pingUrl);
        logger.info({ status: res.status }, "Self-ping OK");
      } catch (pingErr) {
        logger.warn({ err: pingErr }, "Self-ping failed");
      }
    }, PING_INTERVAL_MS);
  }
});
