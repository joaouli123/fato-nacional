import { Pool } from "pg";

// Single shared pg pool for raw-SQL features (newsletter, generation log).
// Avoids multiplying connections against the single Railway Postgres.
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  return pool;
}
