import { loadConfig } from "./config.js";
import { buildApp } from "./app.js";

const config = loadConfig();
const app = await buildApp({ config });

try {
  await app.listen({ host: "0.0.0.0", port: config.port });
  app.log.info(`CLARA Account API listening on port ${config.port}`);
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
