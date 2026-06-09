import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

import {
  hasEnvValue,
  loadLocalEnvFiles,
  printEnvPresence,
  safeDbErrorSummary,
} from "./env-utils.mjs";

const { Pool } = pg;

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");
const REQUIRED_TABLES = [
  "users",
  "accounts",
  "sessions",
  "verification_token",
  "trip_plan_records",
  "trip_plan_versions",
  "trip_plan_shares",
  "schema_migrations",
];

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

async function readMigrationFiles() {
  const filenames = (await readdir(MIGRATIONS_DIR))
    .filter((filename) => filename.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    filenames.map(async (filename) => {
      const filePath = path.join(MIGRATIONS_DIR, filename);
      const sql = await readFile(filePath, "utf8");

      return {
        filename,
        sql,
        checksum: sha256(sql),
      };
    }),
  );
}

async function ensureMigrationLedger(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function applyMigration(client, migration) {
  await client.query("BEGIN");

  try {
    const existing = await client.query(
      `
        SELECT checksum
        FROM schema_migrations
        WHERE filename = $1
        FOR UPDATE
      `,
      [migration.filename],
    );

    if (existing.rows.length > 0) {
      if (existing.rows[0].checksum !== migration.checksum) {
        throw new Error(`Migration checksum mismatch: ${migration.filename}`);
      }

      await client.query("COMMIT");
      return "skipped";
    }

    await client.query(migration.sql);
    await client.query(
      `
        INSERT INTO schema_migrations (filename, checksum)
        VALUES ($1, $2)
      `,
      [migration.filename, migration.checksum],
    );
    await client.query("COMMIT");
    return "applied";
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function readTableStatus(client) {
  const result = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
    `,
    [REQUIRED_TABLES],
  );
  const present = new Set(result.rows.map((row) => row.table_name));

  return REQUIRED_TABLES.map((tableName) => ({
    tableName,
    present: present.has(tableName),
  }));
}

async function main() {
  await loadLocalEnvFiles();

  console.log("[db:migrate] environment preflight");
  printEnvPresence(["DATABASE_URL"]);

  if (!hasEnvValue("DATABASE_URL")) {
    console.error("[db:migrate] not verified: DATABASE_URL is missing.");
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });

  try {
    const client = await pool.connect();

    try {
      await ensureMigrationLedger(client);

      const migrations = await readMigrationFiles();

      for (const migration of migrations) {
        const status = await applyMigration(client, migration);
        console.log(`[db:migrate] ${status}: ${migration.filename}`);
      }

      console.log("[db:migrate] required table status");
      const tableStatus = await readTableStatus(client);

      for (const { tableName, present } of tableStatus) {
        console.log(`- ${tableName}: ${present ? "present" : "missing"}`);
      }

      if (tableStatus.some(({ present }) => !present)) {
        console.error("[db:migrate] not verified: one or more required tables are missing.");
        process.exitCode = 1;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[db:migrate] failed: ${safeDbErrorSummary(error)}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
