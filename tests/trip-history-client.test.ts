import assert from "node:assert/strict";
import test from "node:test";

import { mockTripPlan } from "@/lib/mock/mock-trip-plan";
import {
  createShareLinkClient,
  deleteTripPlanClient,
  getSavedTripPlanDetail,
  getSharedTripClient,
  getTripPlanVersionClient,
  listDeletedTripPlansClient,
  listShareLinksClient,
  listSavedTripPlans,
  listTripPlanVersionsClient,
  revokeShareLinkClient,
  restoreDeletedTripPlanClient,
  restoreTripPlanVersionClient,
} from "@/lib/services/trip-history-client";

const recordId = "323e4567-e89b-42d3-a456-426614174000";
const versionId = "423e4567-e89b-42d3-a456-426614174000";
const secondVersionId = "523e4567-e89b-42d3-a456-426614174000";
const shareId = "723e4567-e89b-42d3-a456-426614174000";
const validShareToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
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

function buildApiShare(overrides: Record<string, unknown> = {}) {
  return {
    id: shareId,
    tokenPreview: validShareToken.slice(-8),
    status: "active",
    versionId,
    expiresAt: null,
    revokedAt: null,
    createdAt: "2026-06-09T00:00:01.000Z",
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

test("delete trip plan client maps 401, 404, and 500 responses safely", async () => {
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
    const result = await deleteTripPlanClient(
      recordId,
      createJsonFetcher(createErrorBody(code), status),
    );

    assert.equal(result.ok, false);

    if (result.ok) {
      throw new Error("Expected delete client to fail.");
    }

    assert.equal(result.error.kind, expectedKind);
    assert.equal(result.error.status, status);
    assert.doesNotMatch(
      result.error.message,
      /userId|DATABASE_URL|AUTH_SECRET|OAuth secret|API Key|Bearer|Authorization|tokenHash|SQL|stack/i,
    );
  }
});

test("deleted trip plans list client maps 401 and 500 responses safely", async () => {
  const cases = [
    {
      status: 401,
      code: "UNAUTHORIZED",
      expectedKind: "unauthorized",
    },
    {
      status: 500,
      code: "INTERNAL_ERROR",
      expectedKind: "server_error",
    },
  ] as const;

  for (const { status, code, expectedKind } of cases) {
    const result = await listDeletedTripPlansClient(
      createJsonFetcher(createErrorBody(code), status),
    );

    assert.equal(result.ok, false);

    if (result.ok) {
      throw new Error("Expected deleted list client to fail.");
    }

    assert.equal(result.error.kind, expectedKind);
    assert.equal(result.error.status, status);
    assert.doesNotMatch(
      result.error.message,
      /userId|DATABASE_URL|AUTH_SECRET|OAuth secret|API Key|Bearer|Authorization|tokenHash|SQL|stack/i,
    );
  }
});

test("restore deleted trip plan client maps 400, 401, 404, and 500 responses safely", async () => {
  const cases = [
    {
      status: 400,
      code: "BAD_REQUEST",
      expectedKind: "bad_request",
    },
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
    const result = await restoreDeletedTripPlanClient(
      recordId,
      createJsonFetcher(createErrorBody(code), status),
    );

    assert.equal(result.ok, false);

    if (result.ok) {
      throw new Error("Expected restore deleted client to fail.");
    }

    assert.equal(result.error.kind, expectedKind);
    assert.equal(result.error.status, status);
    assert.doesNotMatch(
      result.error.message,
      /userId|DATABASE_URL|AUTH_SECRET|OAuth secret|API Key|Bearer|Authorization|tokenHash|SQL|stack/i,
    );
  }
});

test("delete, deleted list, and restore-deleted clients use expected routes and strip internals", async () => {
  const deletedAt = "2026-06-10T00:00:00.000Z";
  const deleteCalls: Array<{
    input: string;
    init?: RequestInit;
  }> = [];
  const deleteResult = await deleteTripPlanClient(
    recordId,
    createRecordingJsonFetcher(
      {
        ok: true,
        data: {
          record: buildApiRecord({
            deletedAt,
            userId: "123e4567-e89b-42d3-a456-426614174000",
            currentVersionId: versionId,
            snapshot: mockTripPlan,
            tokenHash: "hashed-token",
          }),
        },
      },
      200,
      deleteCalls,
    ),
  );

  assert.equal(deleteResult.ok, true);
  assert.equal(deleteCalls.length, 1);
  assert.equal(deleteCalls[0]?.input, `/api/travel-plans/${recordId}`);
  assert.equal(deleteCalls[0]?.init?.method, "DELETE");

  if (!deleteResult.ok) {
    throw new Error("Expected delete client to succeed.");
  }

  const deletedRecord = deleteResult.data.record as Record<string, unknown>;

  assert.equal(deletedRecord.deletedAt, deletedAt);
  assert.equal(deletedRecord.days, 3);
  assert.equal("userId" in deletedRecord, false);
  assert.equal("currentVersionId" in deletedRecord, false);
  assert.equal("snapshot" in deletedRecord, false);
  assert.equal("tokenHash" in deletedRecord, false);

  const listCalls: Array<{
    input: string;
    init?: RequestInit;
  }> = [];
  const listResult = await listDeletedTripPlansClient(
    createRecordingJsonFetcher(
      {
        ok: true,
        data: {
          records: [
            buildApiRecord({
              deletedAt,
              userId: "123e4567-e89b-42d3-a456-426614174000",
              currentVersionId: versionId,
              snapshot: mockTripPlan,
              tokenHash: "hashed-token",
            }),
          ],
        },
      },
      200,
      listCalls,
    ),
  );

  assert.equal(listResult.ok, true);
  assert.equal(listCalls.length, 1);
  assert.equal(listCalls[0]?.input, "/api/travel-plans/deleted");
  assert.equal(listCalls[0]?.init?.method, "GET");

  if (!listResult.ok) {
    throw new Error("Expected deleted list client to succeed.");
  }

  const listedRecord = listResult.data.records[0] as Record<string, unknown>;

  assert.equal(listedRecord.deletedAt, deletedAt);
  assert.equal(listedRecord.days, 3);
  assert.equal("userId" in listedRecord, false);
  assert.equal("currentVersionId" in listedRecord, false);
  assert.equal("snapshot" in listedRecord, false);
  assert.equal("tokenHash" in listedRecord, false);

  const restoreCalls: Array<{
    input: string;
    init?: RequestInit;
  }> = [];
  const restoreResult = await restoreDeletedTripPlanClient(
    recordId,
    createRecordingJsonFetcher(
      {
        ok: true,
        data: {
          record: buildApiRecord({
            userId: "123e4567-e89b-42d3-a456-426614174000",
            currentVersionId: versionId,
            snapshot: mockTripPlan,
            tokenHash: "hashed-token",
          }),
        },
      },
      200,
      restoreCalls,
    ),
  );

  assert.equal(restoreResult.ok, true);
  assert.equal(restoreCalls.length, 1);
  assert.equal(
    restoreCalls[0]?.input,
    `/api/travel-plans/${recordId}/restore-deleted`,
  );
  assert.equal(restoreCalls[0]?.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(restoreCalls[0]?.init?.body)), {});

  if (!restoreResult.ok) {
    throw new Error("Expected restore deleted client to succeed.");
  }

  const restoredRecord = restoreResult.data.record as Record<string, unknown>;

  assert.equal(restoredRecord.days, 3);
  assert.equal("deletedAt" in restoredRecord, false);
  assert.equal("userId" in restoredRecord, false);
  assert.equal("currentVersionId" in restoredRecord, false);
  assert.equal("snapshot" in restoredRecord, false);
  assert.equal("tokenHash" in restoredRecord, false);
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

test("share clients map 401, 404, and 500 responses safely", async () => {
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
    const createResult = await createShareLinkClient(
      recordId,
      createJsonFetcher(createErrorBody(code), status),
    );
    const listResult = await listShareLinksClient(
      recordId,
      createJsonFetcher(createErrorBody(code), status),
    );
    const revokeResult = await revokeShareLinkClient(
      recordId,
      shareId,
      createJsonFetcher(createErrorBody(code), status),
    );
    const publicResult = await getSharedTripClient(
      validShareToken,
      createJsonFetcher(createErrorBody(code), status),
    );

    for (const result of [createResult, listResult, revokeResult, publicResult]) {
      assert.equal(result.ok, false);

      if (result.ok) {
        throw new Error("Expected share client to fail.");
      }

      assert.equal(result.error.kind, expectedKind);
      assert.equal(result.error.status, status);
      assert.doesNotMatch(
        result.error.message,
        /tokenHash|token|userId|DATABASE_URL|AUTH_SECRET|OAuth secret|API Key|Bearer|Authorization|SQL|stack/i,
      );
    }
  }
});

test("create share link client adapts one-time share URL or token and strips internals", async () => {
  const calls: Array<{
    input: string;
    init?: RequestInit;
  }> = [];
  const shareUrl = `http://localhost/shared/trips/${validShareToken}`;
  const result = await createShareLinkClient(
    recordId,
    createRecordingJsonFetcher(
      {
        ok: true,
        data: {
          share: buildApiShare({
            token: validShareToken,
            tokenHash: "hashed-token",
            ownerUserId: "123e4567-e89b-42d3-a456-426614174000",
            tripPlanRecordId: recordId,
            accessCount: 5,
          }),
          shareUrl,
          token: validShareToken,
          tokenHash: "hashed-token",
        },
      },
      200,
      calls,
    ),
  );

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.input, `/api/travel-plans/${recordId}/share-links`);
  assert.equal(calls[0]?.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {});

  if (!result.ok) {
    throw new Error("Expected create share client to succeed.");
  }

  const share = result.data.share as Record<string, unknown>;

  assert.equal(result.data.shareUrl, shareUrl);
  assert.equal(result.data.token, validShareToken);
  assert.equal(share.id, shareId);
  assert.equal(share.tokenPreview, validShareToken.slice(-8));
  assert.equal("token" in share, false);
  assert.equal("tokenHash" in share, false);
  assert.equal("ownerUserId" in share, false);
  assert.equal("tripPlanRecordId" in share, false);
  assert.equal("accessCount" in share, false);

  const tokenOnlyResult = await createShareLinkClient(
    recordId,
    createJsonFetcher({
      ok: true,
      data: {
        share: buildApiShare(),
        token: validShareToken,
      },
    }),
  );

  assert.equal(tokenOnlyResult.ok, true);

  if (!tokenOnlyResult.ok) {
    throw new Error("Expected token-only create share client to succeed.");
  }

  assert.equal(tokenOnlyResult.data.shareUrl, undefined);
  assert.equal(tokenOnlyResult.data.token, validShareToken);
});

test("list share links client strips raw tokens and token hashes", async () => {
  const result = await listShareLinksClient(
    recordId,
    createJsonFetcher({
      ok: true,
      data: {
        shares: [
          buildApiShare({
            token: validShareToken,
            shareUrl: `http://localhost/shared/trips/${validShareToken}`,
            tokenHash: "hashed-token",
            ownerUserId: "123e4567-e89b-42d3-a456-426614174000",
            tripPlanRecordId: recordId,
            accessCount: 5,
            lastAccessedAt: "2026-06-09T00:10:00.000Z",
          }),
        ],
      },
    }),
  );

  assert.equal(result.ok, true);

  if (!result.ok) {
    throw new Error("Expected share list client to succeed.");
  }

  const share = result.data.shares[0] as Record<string, unknown>;

  assert.equal(share.id, shareId);
  assert.equal(share.tokenPreview, validShareToken.slice(-8));
  assert.equal("token" in share, false);
  assert.equal("shareUrl" in share, false);
  assert.equal("tokenHash" in share, false);
  assert.equal("ownerUserId" in share, false);
  assert.equal("tripPlanRecordId" in share, false);
  assert.equal("accessCount" in share, false);
  assert.equal("lastAccessedAt" in share, false);
});

test("revoke share link client uses PATCH and adapts success data safely", async () => {
  const calls: Array<{
    input: string;
    init?: RequestInit;
  }> = [];
  const result = await revokeShareLinkClient(
    recordId,
    shareId,
    createRecordingJsonFetcher(
      {
        ok: true,
        data: {
          share: buildApiShare({
            status: "revoked",
            revokedAt: "2026-06-09T00:05:00.000Z",
            token: validShareToken,
            tokenHash: "hashed-token",
          }),
        },
      },
      200,
      calls,
    ),
  );

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.input, `/api/travel-plans/${recordId}/share-links/${shareId}`);
  assert.equal(calls[0]?.init?.method, "PATCH");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), { status: "revoked" });

  if (!result.ok) {
    throw new Error("Expected revoke client to succeed.");
  }

  const share = result.data.share as Record<string, unknown>;

  assert.equal(share.status, "revoked");
  assert.equal("token" in share, false);
  assert.equal("tokenHash" in share, false);
});

test("public shared trip client exposes only public metadata and the TripPlan snapshot", async () => {
  const result = await getSharedTripClient(
    validShareToken,
    createJsonFetcher({
      ok: true,
      data: {
        tripPlan: mockTripPlan,
        share: {
          id: shareId,
          ownerUserId: "123e4567-e89b-42d3-a456-426614174000",
          tripPlanRecordId: recordId,
          tokenHash: "hashed-token",
          sharedAt: "2026-06-09T00:00:01.000Z",
          expiresAt: null,
          accessCount: 5,
          version: {
            id: versionId,
            versionNumber: 1,
            source: safeSource,
            generationMode: "quick",
            generatedAt: mockTripPlan.generatedAt,
            createdAt: "2026-06-09T00:00:01.000Z",
            userId: "123e4567-e89b-42d3-a456-426614174000",
            tripPlanRecordId: recordId,
          },
        },
      },
    }),
  );

  assert.equal(result.ok, true);

  if (!result.ok) {
    throw new Error("Expected public shared trip client to succeed.");
  }

  const share = result.data.share as Record<string, unknown>;
  const version = result.data.share.version as Record<string, unknown>;

  assert.deepEqual(result.data.tripPlan, mockTripPlan);
  assert.equal(share.sharedAt, "2026-06-09T00:00:01.000Z");
  assert.equal("id" in share, false);
  assert.equal("ownerUserId" in share, false);
  assert.equal("tripPlanRecordId" in share, false);
  assert.equal("tokenHash" in share, false);
  assert.equal("accessCount" in share, false);
  assert.equal(version.versionNumber, 1);
  assert.equal("id" in version, false);
  assert.equal("userId" in version, false);
  assert.equal("tripPlanRecordId" in version, false);
});
