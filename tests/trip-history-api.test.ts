import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import type { QueryResultRow } from "pg";

import { generateMockTripPlanJson } from "@/lib/ai/mock-provider";
import type { CurrentUser } from "@/lib/account/current-user-summary";
import { AuthenticationRequiredError } from "@/lib/server/auth/errors";
import { createTripPlanRecordWithInitialVersion } from "@/lib/server/trip-history/repository";
import {
  handleGetTripPlanDetailRequest,
  handleListTripPlansRequest,
  handleSaveTripPlanRequest,
  type TripPlanRecordForApi,
  type TripPlanVersionForApi,
} from "@/lib/trip-history/api";
import {
  GenerateTripPlanRequestSchema,
  TripPlanSchema,
  type GenerateTripPlanRequest,
  type TripPlan,
} from "@/lib/schemas/trip";

const currentUser: CurrentUser = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  email: "owner@example.test",
  name: "History Owner",
  image: null,
};

const otherUserId = "223e4567-e89b-42d3-a456-426614174000";
const recordId = "323e4567-e89b-42d3-a456-426614174000";
const versionId = "423e4567-e89b-42d3-a456-426614174000";

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

async function authenticatedUser() {
  return currentUser;
}

async function requireUnauthenticatedUser(): Promise<CurrentUser> {
  throw new AuthenticationRequiredError();
}

async function buildValidTripPlan(): Promise<TripPlan> {
  const rawTripPlan = await generateMockTripPlanJson(validRequest);

  return TripPlanSchema.parse(JSON.parse(rawTripPlan));
}

function buildApiRecord(
  tripPlan: TripPlan,
  overrides: Partial<TripPlanRecordForApi> = {},
): TripPlanRecordForApi {
  return {
    id: recordId,
    userId: currentUser.id,
    title: `${tripPlan.input.destination} ${tripPlan.input.startDate} - ${tripPlan.input.endDate}`,
    destination: tripPlan.input.destination,
    departureCity: tripPlan.input.departureCity,
    startDate: tripPlan.input.startDate,
    endDate: tripPlan.input.endDate,
    travelers: tripPlan.input.travelers,
    budgetAmount: tripPlan.input.budget.amount,
    budgetCurrency: tripPlan.input.budget.currency,
    budgetScope: tripPlan.input.budget.scope,
    currentVersionId: versionId,
    sourceProvider: tripPlan.source.provider,
    sourceKind: tripPlan.source.kind,
    generationMode: tripPlan.generationMode,
    createdAt: "2026-06-09T00:00:00.000Z",
    updatedAt: "2026-06-09T00:00:01.000Z",
    deletedAt: null,
    ...overrides,
  };
}

function buildApiVersion(
  tripPlan: TripPlan,
  overrides: Partial<TripPlanVersionForApi> = {},
): TripPlanVersionForApi {
  return {
    id: versionId,
    tripPlanRecordId: recordId,
    userId: currentUser.id,
    versionNumber: 1,
    tripPlanSnapshot: tripPlan,
    sourceProvider: tripPlan.source.provider,
    sourceKind: tripPlan.source.kind,
    generationMode: tripPlan.generationMode,
    generatedAt: tripPlan.generatedAt,
    createdAt: "2026-06-09T00:00:01.000Z",
    restoreFromVersionId: null,
    note: null,
    ...overrides,
  };
}

function buildSaveRequest(body: unknown) {
  return new Request("http://localhost/api/travel-plans/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

test("saved history API handlers return 401 before reading or writing when unauthenticated", async () => {
  let saveWriteCount = 0;
  let listReadCount = 0;
  let detailReadCount = 0;

  const saveResponse = await handleSaveTripPlanRequest(buildSaveRequest({}), {
    requireCurrentUser: requireUnauthenticatedUser,
    async createTripPlanRecordWithInitialVersion() {
      saveWriteCount += 1;
      throw new Error("should not save");
    },
  });
  const listResponse = await handleListTripPlansRequest({
    requireCurrentUser: requireUnauthenticatedUser,
    async listTripPlanRecordsByUser() {
      listReadCount += 1;
      return [];
    },
  });
  const detailResponse = await handleGetTripPlanDetailRequest(recordId, {
    requireCurrentUser: requireUnauthenticatedUser,
    async getTripPlanRecordById() {
      detailReadCount += 1;
      return null;
    },
    async getCurrentTripPlanVersionForRecord() {
      throw new Error("should not read version");
    },
  });

  for (const response of [saveResponse, listResponse, detailResponse]) {
    const json = (await response.json()) as {
      ok: false;
      error: {
        code: string;
      };
    };

    assert.equal(response.status, 401);
    assert.equal(json.ok, false);
    assert.equal(json.error.code, "UNAUTHORIZED");
  }

  assert.equal(saveWriteCount, 0);
  assert.equal(listReadCount, 0);
  assert.equal(detailReadCount, 0);
});

test("save history API returns 400 for an invalid TripPlan without writing", async () => {
  let writeCount = 0;
  const response = await handleSaveTripPlanRequest(
    buildSaveRequest({
      tripPlan: {
        id: "invalid",
      },
    }),
    {
      requireCurrentUser: authenticatedUser,
      async createTripPlanRecordWithInitialVersion() {
        writeCount += 1;
        throw new Error("should not save");
      },
    },
  );
  const json = (await response.json()) as {
    ok: false;
    error: {
      code: string;
    };
  };

  assert.equal(response.status, 400);
  assert.equal(json.ok, false);
  assert.equal(json.error.code, "BAD_REQUEST");
  assert.equal(writeCount, 0);
});

test("save history API creates one owner-scoped record and initial version summary", async () => {
  const tripPlan = await buildValidTripPlan();
  const createInputs: Array<{
    userId: string;
    tripPlan: TripPlan;
  }> = [];
  const response = await handleSaveTripPlanRequest(buildSaveRequest({ tripPlan }), {
    requireCurrentUser: authenticatedUser,
    async createTripPlanRecordWithInitialVersion(input) {
      createInputs.push(input);

      return {
        record: buildApiRecord(input.tripPlan),
        currentVersion: buildApiVersion(input.tripPlan),
      };
    },
  });
  const json = (await response.json()) as {
    ok: true;
    data: {
      record: Record<string, unknown>;
      currentVersion: Record<string, unknown>;
    };
  };

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.equal(createInputs.length, 1);
  assert.equal(createInputs[0]?.userId, currentUser.id);
  assert.deepEqual(createInputs[0]?.tripPlan, tripPlan);
  assert.equal(json.data.record.id, recordId);
  assert.equal(json.data.record.destination, tripPlan.input.destination);
  assert.equal(json.data.currentVersion.id, versionId);
  assert.equal(json.data.currentVersion.versionNumber, 1);
  assert.equal("tripPlan" in json.data.currentVersion, false);
  assert.equal("userId" in json.data.record, false);
  assert.equal("deletedAt" in json.data.record, false);
});

test("list history API only asks for the current user's records and returns safe summaries", async () => {
  const tripPlan = await buildValidTripPlan();
  const listInputs: Array<{
    userId: string;
  }> = [];
  const response = await handleListTripPlansRequest({
    requireCurrentUser: authenticatedUser,
    async listTripPlanRecordsByUser(input) {
      listInputs.push(input);

      return [buildApiRecord(tripPlan)];
    },
  });
  const json = (await response.json()) as {
    ok: true;
    data: {
      records: Array<Record<string, unknown>>;
    };
  };

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.deepEqual(listInputs, [{ userId: currentUser.id }]);
  assert.equal(json.data.records.length, 1);
  assert.equal(json.data.records[0]?.destination, tripPlan.input.destination);
  assert.equal("userId" in (json.data.records[0] ?? {}), false);
  assert.equal("deletedAt" in (json.data.records[0] ?? {}), false);
  assert.equal("currentVersionId" in (json.data.records[0] ?? {}), false);
});

test("detail history API scopes record and current snapshot reads to the current user", async () => {
  const tripPlan = await buildValidTripPlan();
  const recordInputs: Array<{
    userId: string;
    id: string;
  }> = [];
  const versionInputs: Array<{
    userId: string;
    tripPlanRecordId: string;
  }> = [];
  const response = await handleGetTripPlanDetailRequest(recordId, {
    requireCurrentUser: authenticatedUser,
    async getTripPlanRecordById(input) {
      recordInputs.push(input);

      return buildApiRecord(tripPlan);
    },
    async getCurrentTripPlanVersionForRecord(input) {
      versionInputs.push(input);

      return buildApiVersion(tripPlan);
    },
  });
  const json = (await response.json()) as {
    ok: true;
    data: {
      record: Record<string, unknown>;
      currentVersion: {
        versionNumber: number;
        tripPlan: TripPlan;
      };
    };
  };

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.deepEqual(recordInputs, [{ userId: currentUser.id, id: recordId }]);
  assert.deepEqual(versionInputs, [{ userId: currentUser.id, tripPlanRecordId: recordId }]);
  assert.equal(json.data.record.id, recordId);
  assert.equal("userId" in json.data.record, false);
  assert.equal("deletedAt" in json.data.record, false);
  assert.equal(json.data.currentVersion.versionNumber, 1);
  assert.deepEqual(json.data.currentVersion.tripPlan, tripPlan);
});

test("detail history API returns 404 for missing or cross-owner records", async () => {
  let versionReadCount = 0;
  const response = await handleGetTripPlanDetailRequest(recordId, {
    requireCurrentUser: authenticatedUser,
    async getTripPlanRecordById(input) {
      assert.deepEqual(input, { userId: currentUser.id, id: recordId });

      return null;
    },
    async getCurrentTripPlanVersionForRecord() {
      versionReadCount += 1;
      return null;
    },
  });
  const json = (await response.json()) as {
    ok: false;
    error: {
      code: string;
    };
  };

  assert.equal(response.status, 404);
  assert.equal(json.ok, false);
  assert.equal(json.error.code, "NOT_FOUND");
  assert.equal(versionReadCount, 0);
});

test("initial save repository creates a record, version one, and current version pointer together", async () => {
  const tripPlan = await buildValidTripPlan();
  const queries: Array<{
    text: string;
    values: readonly unknown[] | undefined;
  }> = [];
  const createdAt = "2026-06-09T00:00:00.000Z";
  const updatedAt = "2026-06-09T00:00:01.000Z";
  const db = {
    async query<TRow extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: readonly unknown[],
    ) {
      queries.push({ text, values });

      if (/INSERT INTO trip_plan_records/i.test(text)) {
        return {
          rows: [
            {
              id: recordId,
              user_id: currentUser.id,
              title: `${tripPlan.input.destination} ${tripPlan.input.startDate} - ${tripPlan.input.endDate}`,
              destination: tripPlan.input.destination,
              departure_city: tripPlan.input.departureCity,
              start_date: tripPlan.input.startDate,
              end_date: tripPlan.input.endDate,
              travelers: tripPlan.input.travelers,
              budget_amount: tripPlan.input.budget.amount,
              budget_currency: tripPlan.input.budget.currency,
              budget_scope: tripPlan.input.budget.scope,
              current_version_id: null,
              source_provider: tripPlan.source.provider,
              source_kind: tripPlan.source.kind,
              generation_mode: tripPlan.generationMode,
              created_at: createdAt,
              updated_at: createdAt,
              deleted_at: null,
            },
          ] as unknown as TRow[],
        };
      }

      if (/INSERT INTO trip_plan_versions/i.test(text)) {
        return {
          rows: [
            {
              id: versionId,
              trip_plan_record_id: recordId,
              user_id: currentUser.id,
              version_number: 1,
              trip_plan_snapshot: tripPlan,
              source_provider: tripPlan.source.provider,
              source_kind: tripPlan.source.kind,
              generation_mode: tripPlan.generationMode,
              generated_at: tripPlan.generatedAt,
              created_at: updatedAt,
              restore_from_version_id: null,
              note: null,
            },
          ] as unknown as TRow[],
        };
      }

      if (/UPDATE trip_plan_records/i.test(text)) {
        return {
          rows: [
            {
              id: recordId,
              user_id: currentUser.id,
              title: `${tripPlan.input.destination} ${tripPlan.input.startDate} - ${tripPlan.input.endDate}`,
              destination: tripPlan.input.destination,
              departure_city: tripPlan.input.departureCity,
              start_date: tripPlan.input.startDate,
              end_date: tripPlan.input.endDate,
              travelers: tripPlan.input.travelers,
              budget_amount: tripPlan.input.budget.amount,
              budget_currency: tripPlan.input.budget.currency,
              budget_scope: tripPlan.input.budget.scope,
              current_version_id: versionId,
              source_provider: tripPlan.source.provider,
              source_kind: tripPlan.source.kind,
              generation_mode: tripPlan.generationMode,
              created_at: createdAt,
              updated_at: updatedAt,
              deleted_at: null,
            },
          ] as unknown as TRow[],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    },
  };

  const result = await createTripPlanRecordWithInitialVersion({
    userId: currentUser.id,
    tripPlan,
    db,
  });

  assert.equal(queries.length, 3);
  assert.match(queries[0]?.text ?? "", /INSERT INTO trip_plan_records/i);
  assert.match(queries[1]?.text ?? "", /INSERT INTO trip_plan_versions/i);
  assert.match(queries[2]?.text ?? "", /UPDATE trip_plan_records/i);
  assert.equal(queries[1]?.values?.[2], JSON.stringify(tripPlan));
  assert.equal(result.record.currentVersionId, versionId);
  assert.equal(result.currentVersion.versionNumber, 1);
  assert.deepEqual(result.currentVersion.tripPlanSnapshot, tripPlan);
});

test("trip history routes require current user and no out-of-scope routes are added", async () => {
  const repoRoot = process.cwd();
  const routePaths = [
    path.join(repoRoot, "src", "app", "api", "travel-plans", "route.ts"),
    path.join(repoRoot, "src", "app", "api", "travel-plans", "save", "route.ts"),
    path.join(repoRoot, "src", "app", "api", "travel-plans", "[id]", "route.ts"),
  ];

  for (const routePath of routePaths) {
    const source = await readFile(routePath, "utf8");
    assert.match(source, /requireCurrentUser/);
  }

  for (const forbiddenPath of [
    path.join(repoRoot, "src", "app", "api", "travel-plans", "[id]", "restore"),
    path.join(repoRoot, "src", "app", "api", "travel-plans", "[id]", "versions"),
    path.join(repoRoot, "src", "app", "api", "travel-plans", "[id]", "share"),
    path.join(repoRoot, "src", "app", "history"),
    path.join(repoRoot, "src", "app", "admin"),
  ]) {
    assert.equal(existsSync(forbiddenPath), false, forbiddenPath);
  }
});

test("trip history repository keeps list and detail queries owner-scoped and soft-delete aware", async () => {
  const source = await readFile(
    path.join(process.cwd(), "src", "lib", "server", "trip-history", "repository.ts"),
    "utf8",
  );

  assert.match(source, /WHERE user_id = \$1\s+AND deleted_at IS NULL/i);
  assert.match(source, /WHERE id = \$1\s+AND user_id = \$2\s+AND deleted_at IS NULL/i);
  assert.match(source, /WHERE records\.id = \$1\s+AND records\.user_id = \$2\s+AND records\.deleted_at IS NULL/i);
  assert.doesNotMatch(source, new RegExp(otherUserId));
});
