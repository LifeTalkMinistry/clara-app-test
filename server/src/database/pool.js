import pg from "pg";

const { Pool } = pg;

export function createPool(config) {
  return new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export async function withTransaction(pool, callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    // The refresh replay path revokes the entire session chain and then returns a
    // generic unauthorized error. That security mutation must survive the error.
    if (error?.code === "invalid_refresh_session") {
      await client.query("COMMIT");
    } else {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
}
