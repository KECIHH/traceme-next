import "server-only";

import { Pool } from "pg";

export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

let pool: Pool | null = null;

function readDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new DatabaseConfigError("DATABASE_URL is not configured.");
  }

  return databaseUrl;
}

export function getDatabasePool() {
  if (pool !== null) {
    return pool;
  }

  pool = new Pool({
    connectionString: readDatabaseUrl(),
    max: 5,
  });

  return pool;
}

export async function closeDatabasePool() {
  if (pool === null) {
    return;
  }

  await pool.end();
  pool = null;
}
