import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadConfig } from "../config.js";
import { createPool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../../migrations");

export async function runMigrations({ config = loadConfig(), pool = createPool(config) } = {}) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clara_schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const name of files) {
    const existing = await pool.query(
      "SELECT 1 FROM clara_schema_migrations WHERE name = $1",
      [name]
    );
    if (existing.rowCount) continue;

    const sql = await readFile(path.join(migrationsDir, name), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO clara_schema_migrations (name) VALUES ($1)",
        [name]
      );
      await client.query("COMMIT");
      console.info(`[CLARA Account API] applied migration ${name}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  const pool = createPool(config);
  runMigrations({ config, pool })
    .then(async () => {
      await pool.end();
    })
    .catch(async (error) => {
      console.error("[CLARA Account API] migration failed", error);
      await pool.end();
      process.exitCode = 1;
    });
}
