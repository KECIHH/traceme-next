import assert from "node:assert/strict";
import test from "node:test";

import { mockTripPlan } from "@/lib/mock/mock-trip-plan";
import {
  getSavedTripPlanDetail,
  getTripPlanVersionClient,
  listSavedTripPlans,
  listTripPlanVersionsClient,
  restoreTripPlanVersionClient,
} from "@/lib/services/trip-history-client";

const recordId = "323e4567-e89b-42d3-a456-426614174000";
const versionId = "423e4567-e89b-42d3-a456-426614174000";
const secondVersionId = "523e4567-e89b-42d3-a456-426614174000";
const safeSource = {
  provider: "mock",
  kind: "mock",
} as const;

function createJsonFetcher(body: unknown, status = 200) {
  return async () => Response.json(body, { status });
}

function createRecordingJsonFetcher(
  body: unknown,
  status = 200,
  calls: Array<{
    input: string;
    init?: RequestInit;
  }>,
) {
  return async (input: string, init?: RequestInit) => {
    calls.push({ input, init });

    return Response.json(body, { status });
  };
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
    source: safeSource,
    generationMode: "quick",
    createdAt: "2026-06-09T00:00:00.000Z",
    updatedAt: "2026-06-09T00:00:01.000Z",
    ...overrides,
  };
}

function buildApiVersion(overrides: Record<string, unknown> = {}) {
  return {
    id: versionId,
    versionNumber: 1,
    source: safeSource,
    generationMode: "quick",
    generatedAt: mockTripPlan.generatedAt,
    createdAt: "2026-06-09T00:00:01.000Z",
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
            source: safeSource,
            generationMode: "quick",
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
          ...buildApiVersion(),
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

test("trip plan versions client maps 401, 404, and 500 responses safely", async () => {
  const cases = [
    {
      status: 401,
      code: "UNAUTHORIZED",
      expectedKind: "unauthorized",
    },
    {
      status: 404,
      code: "NOT_FOUND",
      expectedKind: "not_found",
    },
    {
      status: 500,
      code: "INTERNAL_ERROR",
      expectedKind: "server_error",
    },
  ] as const;

  for (const { status, code, expectedKind } of cases) {
    const listResult = await listTripPlanVersionsClient(
      recordId,
      createJsonFetcher(createErrorBody(code), status),
    );
    const detailResult = await getTripPlanVersionClient(
      recordId,
      versionId,
      createJsonFetcher(createErrorBody(code), status),
    );
    const restoreResult = await restoreTripPlanVersionClient(
      recordId,
      versionId,
      createJsonFetcher(createErrorBody(code), status),
    );

    for (const result of [listResult, detailResult, restoreResult]) {
      assert.equal(result.ok, false);

      if (result.ok) {
        throw new Error("Expected versions client to fail.");
      }

      assert.equal(result.error.kind, expectedKind);
      assert.equal(result.error.status, status);
      assert.doesNotMatch(
        result.error.message,
        /userId|DATABASE_URL|AUTH_SECRET|OAuth secret|API Key|Bearer|Authorization|SQL|stack/i,
      );
    }
  }
});

test("trip plan versions clients adapt success data and strip internal fields", async () => {
  const listResult = await listTripPlanVersionsClient(
    recordId,
    createJsonFetcher({
      ok: true,
      data: {
        versions: [
          buildApiVersion({
            id: secondVersionId,
            versionNumber: 2,
            userId: "123e4567-e89b-42d3-a456-426614174000",
            tripPlanRecordId: recordId,
            tripPlanSnapshot: mockTripPlan,
            restoreFromVersionId: versionId,
          }),
          buildApiVersion(),
        ],
      },
    }),
  );

  assert.equal(listResult.ok, true);

  if (!listResult.ok) {
    throw new Error("Expected versions list client to succeed.");
  }

  const version = listResult.data.versions[0] as Record<string, unknown>;

  assert.equal(version.id, secondVersionId);
  assert.equal(version.versionNumber, 2);
  assert.deepEqual(version.source, safeSource);
  assert.equal(version.generationMode, "quick");
  assert.equal("userId" in version, false);
  assert.equal("tripPlanRecordId" in version, false);
  assert.equal("tripPlanSnapshot" in version, false);
  assert.equal("restoreFromVersionId" in version, false);

  const detailResult = await getTripPlanVersionClient(
    recordId,
    versionId,
    createJsonFetcher({
      ok: true,
      data: {
        version: {
          ...buildApiVersion(),
          tripPlan: mockTripPlan,
          userId: "123e4567-e89b-42d3-a456-426614174000",
          tripPlanRecordId: recordId,
          tripPlanSnapshot: mockTripPlan,
          restoreFromVersionId: null,
          note: "restored",
        },
      },
    }),
  );

  assert.equal(detailResult.ok, true);

  if (!detailResult.ok) {
    throw new Error("Expected version detail client to succeed.");
  }

  const detail = detailResult.data as Record<string, unknown>;

  assert.deepEqual(detailResult.data.tripPlan, mockTripPlan);
  assert.equal("userId" in detail, false);
  assert.equal("tripPlanRecordId" in detail, false);
  assert.equal("tripPlanSnapshot" in detail, false);
  assert.equal("restoreFromVersionId" in detail, false);
  assert.equal("note" in detail, false);
});

test("restore trip plan version client posts only the version id and adapts success data", async () => {
  const calls: Array<{
    input: string;
    init?: RequestInit;
  }> = [];
  const result = await restoreTripPlanVersionClient(
    recordId,
    versionId,
    createRecordingJsonFetcher(
      {
        ok: true,
        data: {
          currentVersion: buildApiVersion({
            id: secondVersionId,
            versionNumber: 2,
            restoreFromVersionId: versionId,
            userId: "123e4567-e89b-42d3-a456-426614174000",
          }),
        },
      },
      200,
      calls,
    ),
  );

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.input, `/api/travel-plans/${recordId}/restore`);
  assert.equal(calls[0]?.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), { versionId });

  if (!result.ok) {
    throw new Error("Expected restore client to succeed.");
  }

  const currentVersion = result.data.currentVersion as Record<string, unknown>;

  assert.equal(currentVersion.id, secondVersionId);
  assert.equal(currentVersion.versionNumber, 2);
  assert.deepEqual(currentVersion.source, safeSource);
  assert.equal("restoreFromVersionId" in currentVersion, false);
  assert.equal("userId" in currentVersion, false);
});
