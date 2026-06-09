import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { generateMockTripPlanJson } from "@/lib/ai/mock-provider";
import {
  GenerateTripPlanRequestSchema,
  TripPlanSchema,
  type GenerateTripPlanRequest,
  type TripPlan,
} from "@/lib/schemas/trip";
import {
  TripPlanPersistenceValidationError,
  assertUuid,
  buildTripPlanRecordMetadata,
  getNextVersionNumber,
  parseTripPlanSnapshot,
} from "@/lib/trip-history/persistence";

const migrationPath = path.join(
  process.cwd(),
  "db",
  "migrations",
  "0001_account_history_skeleton.sql",
);
const authMigrationPath = path.join(
  process.cwd(),
  "db",
  "migrations",
  "0002_auth_session_boundary.sql",
);
const shareMigrationPath = path.join(
  process.cwd(),
  "db",
  "migrations",
  "0003_trip_plan_shares.sql",
);

const validRequest: GenerateTripPlanRequest = GenerateTripPlanRequestSchema.parse({
  departureCity: "Shanghai",
  destination: "Xiamen",
  startDate: "2026-07-01",
  endDate: "2026-07-03",
  travelers: 2,
  budget: {
    amount: 6000,
    currency: "CNY",
    scope: "total",
  },
  preferences: ["food", "culture"],
  customPreference: "Keep each day flexible.",
  pace: "balanced",
  generationMode: "quick",
});

async function buildValidTripPlan(): Promise<TripPlan> {
  const rawTripPlan = await generateMockTripPlanJson(validRequest);

  return TripPlanSchema.parse(JSON.parse(rawTripPlan));
}

test("account history migration declares required tables, columns, and indexes", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const tableName of ["users", "trip_plan_records", "trip_plan_versions"]) {
    assert.match(sql, new RegExp(`CREATE TABLE ${tableName}`, "i"));
  }

  for (const requiredColumn of [
    "user_id uuid NOT NULL",
    "title text NOT NULL",
    "destination text NOT NULL",
    "departure_city text NOT NULL",
    "trip_plan_snapshot jsonb NOT NULL",
    "source_provider text NOT NULL",
    "source_kind text NOT NULL",
    "generation_mode text NOT NULL",
    "created_at timestamptz NOT NULL",
    "updated_at timestamptz NOT NULL",
    "deleted_at timestamptz",
    "version_number integer NOT NULL",
  ]) {
    assert.match(sql, new RegExp(requiredColumn.replace(/[()]/g, "\\$&"), "i"));
  }

  for (const requiredIndex of [
    "trip_plan_records_user_updated_at_idx",
    "trip_plan_records_user_deleted_at_idx",
    "trip_plan_versions_record_version_number_idx",
    "trip_plan_versions_user_id_idx",
  ]) {
    assert.match(sql, new RegExp(requiredIndex, "i"));
  }
});

test("auth migration declares session boundary tables without replacing users", async () => {
  const sql = await readFile(authMigrationPath, "utf8");

  for (const tableName of ["accounts", "sessions", "verification_token"]) {
    assert.match(sql, new RegExp(`CREATE TABLE ${tableName}`, "i"));
  }

  for (const requiredFragment of [
    'ADD COLUMN IF NOT EXISTS name text',
    'ADD COLUMN IF NOT EXISTS image text',
    'ADD COLUMN IF NOT EXISTS "emailVerified" timestamptz',
    '"userId" uuid NOT NULL REFERENCES users\\(id\\) ON DELETE CASCADE',
    '"sessionToken" varchar\\(255\\) NOT NULL UNIQUE',
    'PRIMARY KEY \\(identifier, token\\)',
    'accounts_provider_account_unique UNIQUE \\(provider, "providerAccountId"\\)',
    'accounts_user_id_idx',
    'sessions_user_id_idx',
  ]) {
    assert.match(sql, new RegExp(requiredFragment, "i"));
  }

  assert.doesNotMatch(sql, /DROP TABLE users/i);
  assert.doesNotMatch(sql, /CREATE TABLE users/i);
  assert.doesNotMatch(sql, /password_hash/i);
});

test("share migration declares hash-only fixed-version share links", async () => {
  const sql = await readFile(shareMigrationPath, "utf8");

  assert.match(sql, /CREATE TABLE trip_plan_shares/i);

  for (const requiredFragment of [
    "owner_user_id uuid NOT NULL REFERENCES users\\(id\\) ON DELETE RESTRICT",
    "trip_plan_record_id uuid NOT NULL REFERENCES trip_plan_records\\(id\\) ON DELETE CASCADE",
    "version_id uuid NOT NULL REFERENCES trip_plan_versions\\(id\\) ON DELETE CASCADE",
    "token_hash text NOT NULL UNIQUE",
    "token_preview text NOT NULL",
    "status text NOT NULL DEFAULT 'active' CHECK \\(status IN \\('active', 'revoked'\\)\\)",
    "expires_at timestamptz",
    "revoked_at timestamptz",
    "last_accessed_at timestamptz",
    "access_count integer NOT NULL DEFAULT 0 CHECK \\(access_count >= 0\\)",
    "trip_plan_shares_owner_record_created_at_idx",
    "trip_plan_shares_owner_record_status_idx",
    "trip_plan_shares_active_token_hash_idx",
    "trip_plan_shares_version_id_idx",
  ]) {
    assert.match(sql, new RegExp(requiredFragment, "i"));
  }

  assert.doesNotMatch(sql, /token text/i);
  assert.doesNotMatch(sql, /raw_token/i);
  assert.doesNotMatch(sql, /share_token text/i);
});

test("trip plan persistence helpers validate user ids and version numbers", () => {
  assert.equal(
    assertUuid("123e4567-e89b-12d3-a456-426614174000", "userId"),
    "123e4567-e89b-12d3-a456-426614174000",
  );
  assert.throws(
    () => assertUuid("not-a-user-id", "userId"),
    TripPlanPersistenceValidationError,
  );
  assert.equal(getNextVersionNumber(undefined), 1);
  assert.equal(getNextVersionNumber(null), 1);
  assert.equal(getNextVersionNumber(2), 3);
  assert.throws(
    () => getNextVersionNumber(0),
    TripPlanPersistenceValidationError,
  );
});

test("trip plan persistence helpers derive record metadata from a valid snapshot", async () => {
  const tripPlan = await buildValidTripPlan();
  const metadata = buildTripPlanRecordMetadata(tripPlan, "  Summer Xiamen draft  ");

  assert.equal(metadata.title, "Summer Xiamen draft");
  assert.equal(metadata.destination, tripPlan.input.destination);
  assert.equal(metadata.departureCity, tripPlan.input.departureCity);
  assert.equal(metadata.startDate, tripPlan.input.startDate);
  assert.equal(metadata.endDate, tripPlan.input.endDate);
  assert.equal(metadata.travelers, tripPlan.input.travelers);
  assert.equal(metadata.budgetAmount, tripPlan.input.budget.amount);
  assert.equal(metadata.budgetCurrency, tripPlan.input.budget.currency);
  assert.equal(metadata.budgetScope, tripPlan.input.budget.scope);
  assert.equal(metadata.sourceProvider, tripPlan.source.provider);
  assert.equal(metadata.sourceKind, tripPlan.source.kind);
  assert.equal(metadata.generationMode, tripPlan.generationMode);
  assert.equal(metadata.generatedAt, tripPlan.generatedAt);
});

test("trip plan snapshot keeps the existing TripPlanSchema contract only", async () => {
  const tripPlan = await buildValidTripPlan();
  const snapshot = parseTripPlanSnapshot(tripPlan);

  assert.deepEqual(TripPlanSchema.safeParse(snapshot).success, true);
  assert.equal("userId" in snapshot, false);
  assert.equal("ownerId" in snapshot, false);
  assert.equal("versionNumber" in snapshot, false);
  assert.equal("deletedAt" in snapshot, false);

  const invalidSnapshot = {
    ...tripPlan,
    input: {
      ...tripPlan.input,
      days: tripPlan.input.days + 1,
    },
  };

  assert.throws(
    () => parseTripPlanSnapshot(invalidSnapshot),
    TripPlanPersistenceValidationError,
  );
});
