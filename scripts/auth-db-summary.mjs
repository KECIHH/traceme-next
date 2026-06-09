import pg from "pg";

import {
  hasEnvValue,
  loadLocalEnvFiles,
  printEnvPresence,
  safeDbErrorSummary,
} from "./env-utils.mjs";

const { Pool } = pg;

const ENV_NAMES = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_URL",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
];

const TABLES = [
  "users",
  "accounts",
  "sessions",
  "verification_token",
  "trip_plan_records",
  "trip_plan_versions",
  "schema_migrations",
];

const COUNTED_TABLES = ["users", "accounts", "sessions"];

function quoteIdentifier(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe identifier: ${identifier}`);
  }

  return `"${identifier}"`;
}

async function readTableStatus(pool) {
  const result = await pool.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
    `,
    [TABLES],
  );
  const present = new Set(result.rows.map((row) => row.table_name));

  return TABLES.map((tableName) => ({
    tableName,
    present: present.has(tableName),
  }));
}

async function countTable(pool, tableName) {
  const result = await pool.query(
    `SELECT count(*)::integer AS count FROM ${quoteIdentifier(tableName)}`,
  );

  return result.rows[0]?.count ?? 0;
}

async function readLatestUserSummary(pool) {
  const result = await pool.query(`
    SELECT id, email, name, image
    FROM users
    ORDER BY created_at DESC NULLS LAST, id DESC
    LIMIT 1
  `);

  const row = result.rows[0];

  if (row === undefined) {
    return null;
  }

  return {
    id: Boolean(row.id),
    email: row.email === null ? "null" : "present",
    name: row.name === null ? "null" : "present",
    image: row.image === null ? "null" : "present",
  };
}

async function main() {
  await loadLocalEnvFiles();

  console.log("[auth:db-summary] environment preflight");
  printEnvPresence(ENV_NAMES);

  if (!hasEnvValue("DATABASE_URL")) {
    console.error("[auth:db-summary] not verified: DATABASE_URL is missing.");
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });

  try {
    const tableStatus = await readTableStatus(pool);

    console.log("[auth:db-summary] table status");
    for (const { tableName, present } of tableStatus) {
      console.log(`- ${tableName}: ${present ? "present" : "missing"}`);
    }

    if (tableStatus.some(({ present }) => !present)) {
      console.error("[auth:db-summary] not verified: one or more required tables are missing.");
      process.exitCode = 1;
      return;
    }

    console.log("[auth:db-summary] auth row counts");
    for (const tableName of COUNTED_TABLES) {
      console.log(`- ${tableName}: ${await countTable(pool, tableName)}`);
    }

    const latestUserSummary = await readLatestUserSummary(pool);
    console.log("[auth:db-summary] latest user summary fields");

    if (latestUserSummary === null) {
      console.log("- exists: no");
    } else {
      console.log("- exists: yes");
      console.log(`- id: ${latestUserSummary.id ? "present" : "missing"}`);
      console.log(`- email: ${latestUserSummary.email}`);
      console.log(`- name: ${latestUserSummary.name}`);
      console.log(`- image: ${latestUserSummary.image}`);
    }

    console.log("[auth:db-summary] sensitive fields queried: no");
  } catch (error) {
    console.error(`[auth:db-summary] failed: ${safeDbErrorSummary(error)}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
