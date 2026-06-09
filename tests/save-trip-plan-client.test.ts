import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { mockTripPlan } from "@/lib/mock/mock-trip-plan";
import {
  buildSavingSaveTripPlanActionState,
  buildSaveTripPlanActionView,
  getEffectiveSaveTripPlanActionState,
  settleSaveTripPlanActionState,
  type ScopedSaveTripPlanActionState,
  type SaveTripPlanActionView,
} from "@/lib/services/save-trip-plan-action-view";
import {
  saveTripPlanClient,
  type SavedTripPlanSaveData,
} from "@/lib/services/save-trip-plan-client";

const recordId = "323e4567-e89b-42d3-a456-426614174000";
const versionId = "423e4567-e89b-42d3-a456-426614174000";

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

function buildApiVersion(overrides: Record<string, unknown> = {}) {
  return {
    id: versionId,
    versionNumber: 1,
    generatedAt: mockTripPlan.generatedAt,
    createdAt: "2026-06-09T00:00:01.000Z",
    ...overrides,
  };
}

function createErrorBody(code: string, message = "Internal diagnostic that must be ignored.") {
  return {
    ok: false,
    error: {
      code,
      message,
      requestId: "request-id",
    },
  };
}

function stringifyView(view: SaveTripPlanActionView) {
  return JSON.stringify(view);
}

test("save trip plan client maps 401 responses to unauthorized", async () => {
  const result = await saveTripPlanClient(
    mockTripPlan,
    createJsonFetcher(createErrorBody("UNAUTHORIZED"), 401),
  );

  assert.equal(result.ok, false);

  if (result.ok) {
    throw new Error("Expected save client to fail.");
  }

  assert.equal(result.error.kind, "unauthorized");
  assert.equal(result.error.status, 401);
  assert.equal(result.error.message, "请先登录后保存。");
});

test("save trip plan client maps 400 responses to bad_request", async () => {
  const result = await saveTripPlanClient(
    mockTripPlan,
    createJsonFetcher(createErrorBody("BAD_REQUEST"), 400),
  );

  assert.equal(result.ok, false);

  if (result.ok) {
    throw new Error("Expected save client to fail.");
  }

  assert.equal(result.error.kind, "bad_request");
  assert.equal(result.error.status, 400);
  assert.equal(result.error.message, "当前计划无法保存，请重新生成后再试。");
});

test("save trip plan client maps 500 responses to server_error", async () => {
  const result = await saveTripPlanClient(
    mockTripPlan,
    createJsonFetcher(createErrorBody("INTERNAL_ERROR", "stack SQL DATABASE_URL"), 500),
  );

  assert.equal(result.ok, false);

  if (result.ok) {
    throw new Error("Expected save client to fail.");
  }

  assert.equal(result.error.kind, "server_error");
  assert.equal(result.error.status, 500);
  assert.equal(result.error.message, "保存服务暂时不可用，请稍后重试。");
  assert.doesNotMatch(result.error.message, /stack|SQL|DATABASE_URL/i);
});

test("save trip plan client posts the snapshot to the save API", async () => {
  const calls: Array<{
    input: string;
    init?: RequestInit;
  }> = [];
  const result = await saveTripPlanClient(mockTripPlan, async (input, init) => {
    calls.push({ input, init });

    return Response.json({
      ok: true,
      data: {
        record: buildApiRecord(),
        currentVersion: buildApiVersion(),
      },
    });
  });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.input, "/api/travel-plans/save");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), { tripPlan: mockTripPlan });
});

test("save trip plan client returns safe summaries and strips internal fields", async () => {
  const result = await saveTripPlanClient(
    mockTripPlan,
    createJsonFetcher({
      ok: true,
      data: {
        record: buildApiRecord({
          userId: "123e4567-e89b-42d3-a456-426614174000",
          deletedAt: null,
          currentVersionId: versionId,
        }),
        currentVersion: buildApiVersion({
          tripPlanRecordId: recordId,
          userId: "123e4567-e89b-42d3-a456-426614174000",
          tripPlanSnapshot: mockTripPlan,
          restoreFromVersionId: null,
          note: "initial save",
        }),
      },
    }),
  );

  assert.equal(result.ok, true);

  if (!result.ok) {
    throw new Error("Expected save client to succeed.");
  }

  const record = result.data.record as Record<string, unknown>;
  const currentVersion = result.data.currentVersion as Record<string, unknown>;

  assert.equal(record.id, recordId);
  assert.equal(record.days, 3);
  assert.equal(currentVersion.id, versionId);
  assert.equal(currentVersion.versionNumber, 1);
  assert.equal("userId" in record, false);
  assert.equal("deletedAt" in record, false);
  assert.equal("currentVersionId" in record, false);
  assert.equal("tripPlanRecordId" in currentVersion, false);
  assert.equal("userId" in currentVersion, false);
  assert.equal("tripPlanSnapshot" in currentVersion, false);
  assert.equal("restoreFromVersionId" in currentVersion, false);
  assert.equal("note" in currentVersion, false);
});

test("save trip plan action view exposes safe success links", () => {
  const data: SavedTripPlanSaveData = {
    record: {
      ...buildApiRecord(),
      days: 3,
    } as SavedTripPlanSaveData["record"],
    currentVersion: buildApiVersion() as SavedTripPlanSaveData["currentVersion"],
  };
  const view = buildSaveTripPlanActionView({
    status: "saved",
    data,
  });
  const serialized = stringifyView(view);

  assert.equal(view.buttonLabel, "已保存");
  assert.equal(view.buttonDisabled, true);
  assert.equal(view.feedback?.message, "已保存到我的行程。");
  assert.equal(view.detailLink, `/trips/${recordId}`);
  assert.equal(view.listLink, "/trips");
  assert.equal(view.loginLink, null);
  assert.doesNotMatch(serialized, /userId|DATABASE_URL|AUTH_SECRET|secret|token|SQL|stack/i);
});

test("save trip plan action view keeps unauthenticated users on the current page", () => {
  const view = buildSaveTripPlanActionView({
    status: "error",
    error: {
      kind: "unauthorized",
      message: "ignored server text",
      status: 401,
    },
  });
  const serialized = stringifyView(view);

  assert.equal(view.buttonLabel, "保存到我的行程");
  assert.equal(view.buttonDisabled, false);
  assert.match(view.feedback?.message ?? "", /当前结果仍保留在本页/);
  assert.equal(view.loginLink?.href, "/api/auth/signin?callbackUrl=%2F");
  assert.equal(view.loginLink?.target, "_blank");
  assert.equal(view.loginLink?.rel, "noreferrer");
  assert.doesNotMatch(serialized, /userId|DATABASE_URL|AUTH_SECRET|secret|token|SQL|stack/i);
});

test("save trip plan action state ignores stale save completions", () => {
  const firstSnapshotKey = "trip-a:2026-06-09T00:00:00.000Z";
  const secondSnapshotKey = "trip-b:2026-06-09T00:01:00.000Z";
  const savingSecondSnapshot = buildSavingSaveTripPlanActionState(secondSnapshotKey);
  const settledFirstSnapshot = settleSaveTripPlanActionState(
    savingSecondSnapshot,
    firstSnapshotKey,
    {
      status: "saved",
      data: {
        record: {
          ...buildApiRecord(),
          days: 3,
        } as SavedTripPlanSaveData["record"],
        currentVersion: buildApiVersion() as SavedTripPlanSaveData["currentVersion"],
      },
    },
  );

  assert.deepEqual(settledFirstSnapshot, savingSecondSnapshot);
  assert.deepEqual(
    getEffectiveSaveTripPlanActionState(settledFirstSnapshot, secondSnapshotKey),
    savingSecondSnapshot,
  );
  assert.deepEqual(
    getEffectiveSaveTripPlanActionState(
      settledFirstSnapshot as ScopedSaveTripPlanActionState,
      firstSnapshotKey,
    ),
    { status: "idle" },
  );
});

test("save entry does not persist TripPlan snapshots in browser storage", async () => {
  const sourcePaths = [
    path.join(process.cwd(), "src", "components", "trip", "result-actions.tsx"),
    path.join(process.cwd(), "src", "lib", "services", "save-trip-plan-client.ts"),
    path.join(process.cwd(), "src", "lib", "services", "save-trip-plan-action-view.ts"),
  ];

  for (const sourcePath of sourcePaths) {
    const source = await readFile(sourcePath, "utf8");

    assert.doesNotMatch(source, /localStorage|sessionStorage/);
  }
});

test("generated page does not automatically save trip plans", async () => {
  const pageSource = await readFile(path.join(process.cwd(), "src", "app", "page.tsx"), "utf8");

  assert.doesNotMatch(pageSource, /saveTripPlanClient/);
  assert.doesNotMatch(pageSource, /\/api\/travel-plans\/save/);
  assert.match(pageSource, /showSaveAction/);
});
