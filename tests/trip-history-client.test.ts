import assert from "node:assert/strict";
import test from "node:test";

import { mockTripPlan } from "@/lib/mock/mock-trip-plan";
import {
  getSavedTripPlanDetail,
  listSavedTripPlans,
} from "@/lib/services/trip-history-client";

const recordId = "323e4567-e89b-42d3-a456-426614174000";

function createJsonFetcher(body: unknown, status = 200) {
  return async () => Response.json(body, { status });
}

function buildApiRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: recordId,
    title: "Xiamen 2026-07-01 - 2026-07-03",
    destination: "Xiamen",
    departureCity: "Shanghai",
    startDate: "2026-07-01",
    endDate: "2026-07-03",
    travelers: 2,
    budget: {
      amount: 6000,
      currency: "CNY",
      scope: "total",
    },
    source: {
      provider: "mock",
      kind: "mock",
    },
    generationMode: "quick",
    createdAt: "2026-06-09T00:00:00.000Z",
    updatedAt: "2026-06-09T00:00:01.000Z",
    ...overrides,
  };
}

function createErrorBody(code: string) {
  return {
    ok: false,
    error: {
      code,
      message: "Request failed.",
      requestId: "request-id",
    },
  };
}

test("trip history list client maps 401 responses to unauthorized", async () => {
  const result = await listSavedTripPlans(
    createJsonFetcher(createErrorBody("UNAUTHORIZED"), 401),
  );

  assert.equal(result.ok, false);

  if (result.ok) {
    throw new Error("Expected list client to fail.");
  }

  assert.equal(result.error.kind, "unauthorized");
  assert.equal(result.error.status, 401);
});

test("trip history detail client maps 401 responses to unauthorized", async () => {
  const result = await getSavedTripPlanDetail(
    recordId,
    createJsonFetcher(createErrorBody("UNAUTHORIZED"), 401),
  );

  assert.equal(result.ok, false);

  if (result.ok) {
    throw new Error("Expected detail client to fail.");
  }

  assert.equal(result.error.kind, "unauthorized");
  assert.equal(result.error.status, 401);
});

test("trip history list client maps 404 responses to not_found", async () => {
  const result = await listSavedTripPlans(
    createJsonFetcher(createErrorBody("NOT_FOUND"), 404),
  );

  assert.equal(result.ok, false);

  if (result.ok) {
    throw new Error("Expected list client to fail.");
  }

  assert.equal(result.error.kind, "not_found");
  assert.equal(result.error.status, 404);
});

test("trip history detail client maps 404 responses to not_found", async () => {
  const result = await getSavedTripPlanDetail(
    recordId,
    createJsonFetcher(createErrorBody("NOT_FOUND"), 404),
  );

  assert.equal(result.ok, false);

  if (result.ok) {
    throw new Error("Expected detail client to fail.");
  }

  assert.equal(result.error.kind, "not_found");
  assert.equal(result.error.status, 404);
});

test("trip history list client rejects success-shaped non-2xx responses", async () => {
  const result = await listSavedTripPlans(
    createJsonFetcher(
      {
        ok: true,
        data: {
          records: [buildApiRecord()],
        },
      },
      500,
    ),
  );

  assert.equal(result.ok, false);

  if (result.ok) {
    throw new Error("Expected list client to fail.");
  }

  assert.equal(result.error.kind, "server_error");
  assert.equal(result.error.status, 500);
});

test("trip history detail client rejects success-shaped non-2xx responses", async () => {
  const result = await getSavedTripPlanDetail(
    recordId,
    createJsonFetcher(
      {
        ok: true,
        data: {
          record: buildApiRecord(),
          currentVersion: {
            versionNumber: 1,
            generatedAt: mockTripPlan.generatedAt,
            createdAt: "2026-06-09T00:00:01.000Z",
            tripPlan: mockTripPlan,
          },
        },
      },
      500,
    ),
  );

  assert.equal(result.ok, false);

  if (result.ok) {
    throw new Error("Expected detail client to fail.");
  }

  assert.equal(result.error.kind, "server_error");
  assert.equal(result.error.status, 500);
});

test("trip history list client strips internal record fields", async () => {
  const result = await listSavedTripPlans(
    createJsonFetcher({
      ok: true,
      data: {
        records: [
          buildApiRecord({
            userId: "123e4567-e89b-42d3-a456-426614174000",
            deletedAt: null,
            currentVersionId: "423e4567-e89b-42d3-a456-426614174000",
          }),
        ],
      },
    }),
  );

  assert.equal(result.ok, true);

  if (!result.ok) {
    throw new Error("Expected list client to succeed.");
  }

  const record = result.data.records[0] as Record<string, unknown>;

  assert.equal(record.days, 3);
  assert.equal("userId" in record, false);
  assert.equal("deletedAt" in record, false);
  assert.equal("currentVersionId" in record, false);
});

test("trip history detail client strips internal record and version fields", async () => {
  const result = await getSavedTripPlanDetail(
    recordId,
    createJsonFetcher({
      ok: true,
      data: {
        record: buildApiRecord({
          userId: "123e4567-e89b-42d3-a456-426614174000",
          deletedAt: null,
          currentVersionId: "423e4567-e89b-42d3-a456-426614174000",
        }),
        currentVersion: {
          versionNumber: 1,
          generatedAt: mockTripPlan.generatedAt,
          createdAt: "2026-06-09T00:00:01.000Z",
          tripPlan: mockTripPlan,
          tripPlanRecordId: recordId,
          userId: "123e4567-e89b-42d3-a456-426614174000",
          restoreFromVersionId: null,
          note: "initial save",
        },
      },
    }),
  );

  assert.equal(result.ok, true);

  if (!result.ok) {
    throw new Error("Expected detail client to succeed.");
  }

  const record = result.data.record as Record<string, unknown>;
  const currentVersion = result.data.currentVersion as Record<string, unknown>;

  assert.equal(record.days, 3);
  assert.deepEqual(result.data.currentVersion.tripPlan, mockTripPlan);
  assert.equal("userId" in record, false);
  assert.equal("deletedAt" in record, false);
  assert.equal("currentVersionId" in record, false);
  assert.equal("tripPlanRecordId" in currentVersion, false);
  assert.equal("userId" in currentVersion, false);
  assert.equal("restoreFromVersionId" in currentVersion, false);
  assert.equal("note" in currentVersion, false);
});
