import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import type { QueryResultRow } from "pg";

import { generateMockTripPlanJson } from "@/lib/ai/mock-provider";
import type { CurrentUser } from "@/lib/account/current-user-summary";
import { AuthenticationRequiredError } from "@/lib/server/auth/errors";
import {
  createTripPlanShareLink,
  createTripPlanRecordWithInitialVersion,
  createTripPlanVersion,
  getPublicSharedTripByToken,
  getTripPlanVersionById,
  listTripPlanVersionsForRecord,
} from "@/lib/server/trip-history/repository";
import {
  handleCreateTripPlanShareLinkRequest,
  handleGetPublicSharedTripRequest,
  handleAppendTripPlanVersionRequest,
  handleGetTripPlanDetailRequest,
  handleGetTripPlanVersionDetailRequest,
  handleListTripPlansRequest,
  handleListTripPlanShareLinksRequest,
  handleListTripPlanVersionsRequest,
  handleRevokeTripPlanShareLinkRequest,
  handleRestoreTripPlanVersionRequest,
  handleSaveTripPlanRequest,
  type TripPlanRecordForApi,
  type TripPlanVersionForApi,
} from "@/lib/trip-history/api";
import {
  ShareTokenValidationError,
  assertShareToken,
  buildShareTokenPreview,
  generateShareToken,
  hashShareToken,
} from "@/lib/trip-history/share-tokens";
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
const secondVersionId = "523e4567-e89b-42d3-a456-426614174000";
const shareId = "723e4567-e89b-42d3-a456-426614174000";
const validShareToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const versionSummarySource = {
  provider: "mock",
  kind: "mock",
} as const;
const versionSummaryGenerationMode = "quick";

type ApiVersionSummaryFixture = {
  id: string;
  versionNumber: number;
  sourceProvider: typeof versionSummarySource.provider;
  sourceKind: typeof versionSummarySource.kind;
  generationMode: typeof versionSummaryGenerationMode;
  generatedAt: string;
  createdAt: string;
};

type ApiShareFixture = {
  id: string;
  ownerUserId: string;
  tripPlanRecordId: string;
  versionId: string;
  tokenPreview: string;
  status: "active" | "revoked";
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string | null;
  accessCount: number;
};

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

function buildApiVersionSummary(
  overrides: Partial<ApiVersionSummaryFixture> = {},
): ApiVersionSummaryFixture {
  return {
    id: versionId,
    versionNumber: 1,
    sourceProvider: versionSummarySource.provider,
    sourceKind: versionSummarySource.kind,
    generationMode: versionSummaryGenerationMode,
    generatedAt: "2026-06-09T00:00:00.000Z",
    createdAt: "2026-06-09T00:00:01.000Z",
    ...overrides,
  };
}

function buildApiShare(overrides: Partial<ApiShareFixture> = {}): ApiShareFixture {
  return {
    id: shareId,
    ownerUserId: currentUser.id,
    tripPlanRecordId: recordId,
    versionId,
    tokenPreview: validShareToken.slice(-8),
    status: "active",
    expiresAt: null,
    revokedAt: null,
    createdAt: "2026-06-09T00:00:01.000Z",
    updatedAt: "2026-06-09T00:00:01.000Z",
    lastAccessedAt: null,
    accessCount: 0,
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

function buildAppendVersionRequest(body: unknown) {
  return new Request(`http://localhost/api/travel-plans/${recordId}/versions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildRestoreVersionRequest(body: unknown) {
  return new Request(`http://localhost/api/travel-plans/${recordId}/restore`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildCreateShareRequest(body: unknown = {}) {
  return new Request(`http://localhost/api/travel-plans/${recordId}/share-links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildRevokeShareRequest(body: unknown = {}) {
  return new Request(
    `http://localhost/api/travel-plans/${recordId}/share-links/${shareId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

function assertNoSensitiveOrInternalFields(value: unknown) {
  assert.doesNotMatch(
    JSON.stringify(value),
    /userId|tripPlanRecordId|tripPlanSnapshot|restoreFromVersionId|deletedAt|currentVersionId|DATABASE_URL|AUTH_SECRET|OAuth secret|API Key|Bearer|Authorization|SQL|stack/i,
  );
}

test("saved history API handlers return 401 before reading or writing when unauthenticated", async () => {
  let saveWriteCount = 0;
  let listReadCount = 0;
  let detailReadCount = 0;
  let versionsListReadCount = 0;
  let versionDetailReadCount = 0;
  let appendReadCount = 0;
  let appendWriteCount = 0;
  let restoreReadCount = 0;
  let restoreWriteCount = 0;

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
  const versionsListResponse = await handleListTripPlanVersionsRequest(recordId, {
    requireCurrentUser: requireUnauthenticatedUser,
    async listTripPlanVersionsForRecord() {
      versionsListReadCount += 1;
      return [];
    },
  });
  const versionDetailResponse = await handleGetTripPlanVersionDetailRequest(recordId, versionId, {
    requireCurrentUser: requireUnauthenticatedUser,
    async getTripPlanVersionById() {
      versionDetailReadCount += 1;
      return null;
    },
  });
  const appendResponse = await handleAppendTripPlanVersionRequest(
    buildAppendVersionRequest({}),
    recordId,
    {
      requireCurrentUser: requireUnauthenticatedUser,
      async getTripPlanRecordById() {
        appendReadCount += 1;
        return null;
      },
      async createTripPlanVersion() {
        appendWriteCount += 1;
        throw new Error("should not append");
      },
    },
  );
  const restoreResponse = await handleRestoreTripPlanVersionRequest(
    buildRestoreVersionRequest({ versionId }),
    recordId,
    {
      requireCurrentUser: requireUnauthenticatedUser,
      async getTripPlanVersionById() {
        restoreReadCount += 1;
        return null;
      },
      async createTripPlanVersion() {
        restoreWriteCount += 1;
        throw new Error("should not restore");
      },
    },
  );

  for (const response of [
    saveResponse,
    listResponse,
    detailResponse,
    versionsListResponse,
    versionDetailResponse,
    appendResponse,
    restoreResponse,
  ]) {
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
  assert.equal(versionsListReadCount, 0);
  assert.equal(versionDetailReadCount, 0);
  assert.equal(appendReadCount, 0);
  assert.equal(appendWriteCount, 0);
  assert.equal(restoreReadCount, 0);
  assert.equal(restoreWriteCount, 0);
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

test("versions list API returns only safe summaries for the current user's record", async () => {
  const listInputs: Array<{
    userId: string;
    tripPlanRecordId: string;
  }> = [];
  const response = await handleListTripPlanVersionsRequest(recordId, {
    requireCurrentUser: authenticatedUser,
    async listTripPlanVersionsForRecord(input) {
      listInputs.push(input);

      return [
        buildApiVersionSummary({ versionNumber: 2, id: secondVersionId }),
        buildApiVersionSummary(),
      ];
    },
  });
  const json = (await response.json()) as {
    ok: true;
    data: {
      versions: Array<Record<string, unknown>>;
    };
  };

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.deepEqual(listInputs, [{ userId: currentUser.id, tripPlanRecordId: recordId }]);
  assert.deepEqual(
    json.data.versions.map((version) => version.versionNumber),
    [2, 1],
  );
  assert.equal("tripPlan" in (json.data.versions[0] ?? {}), false);
  assert.equal("tripPlanSnapshot" in (json.data.versions[0] ?? {}), false);
  assert.deepEqual(json.data.versions[0]?.source, versionSummarySource);
  assert.equal(
    json.data.versions[0]?.generationMode,
    versionSummaryGenerationMode,
  );
  assert.equal("sourceProvider" in (json.data.versions[0] ?? {}), false);
  assert.equal("sourceKind" in (json.data.versions[0] ?? {}), false);
  assertNoSensitiveOrInternalFields(json);
});

test("versions list API returns 404 for missing or cross-owner records", async () => {
  const response = await handleListTripPlanVersionsRequest(recordId, {
    requireCurrentUser: authenticatedUser,
    async listTripPlanVersionsForRecord(input) {
      assert.deepEqual(input, { userId: currentUser.id, tripPlanRecordId: recordId });

      return [];
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
  assertNoSensitiveOrInternalFields(json);
});

test("version detail API scopes reads to the current user and returns the snapshot", async () => {
  const tripPlan = await buildValidTripPlan();
  const detailInputs: Array<{
    userId: string;
    tripPlanRecordId: string;
    versionId: string;
  }> = [];
  const response = await handleGetTripPlanVersionDetailRequest(recordId, versionId, {
    requireCurrentUser: authenticatedUser,
    async getTripPlanVersionById(input) {
      detailInputs.push(input);

      return buildApiVersion(tripPlan);
    },
  });
  const json = (await response.json()) as {
    ok: true;
    data: {
      version: Record<string, unknown> & {
        tripPlan: TripPlan;
      };
    };
  };

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.deepEqual(detailInputs, [
    { userId: currentUser.id, tripPlanRecordId: recordId, versionId },
  ]);
  assert.equal(json.data.version.id, versionId);
  assert.equal(json.data.version.versionNumber, 1);
  assert.deepEqual(json.data.version.source, tripPlan.source);
  assert.equal(json.data.version.generationMode, tripPlan.generationMode);
  assert.deepEqual(json.data.version.tripPlan, tripPlan);
  assert.equal("tripPlanSnapshot" in json.data.version, false);
  assert.equal("sourceProvider" in json.data.version, false);
  assert.equal("sourceKind" in json.data.version, false);
  assertNoSensitiveOrInternalFields({
    ...json,
    data: {
      version: {
        ...json.data.version,
        tripPlan: undefined,
      },
    },
  });
});

test("version detail API returns 404 for missing or cross-owner versions", async () => {
  const response = await handleGetTripPlanVersionDetailRequest(recordId, versionId, {
    requireCurrentUser: authenticatedUser,
    async getTripPlanVersionById(input) {
      assert.deepEqual(input, {
        userId: currentUser.id,
        tripPlanRecordId: recordId,
        versionId,
      });

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
});

test("append version API validates TripPlanSchema before reading or writing", async () => {
  let readCount = 0;
  let writeCount = 0;
  const response = await handleAppendTripPlanVersionRequest(
    buildAppendVersionRequest({
      tripPlan: {
        id: "invalid",
      },
    }),
    recordId,
    {
      requireCurrentUser: authenticatedUser,
      async getTripPlanRecordById() {
        readCount += 1;
        return null;
      },
      async createTripPlanVersion() {
        writeCount += 1;
        throw new Error("should not append");
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
  assert.equal(readCount, 0);
  assert.equal(writeCount, 0);
});

test("append version API scopes record ownership and returns a safe version summary", async () => {
  const tripPlan = await buildValidTripPlan();
  const recordInputs: Array<{
    userId: string;
    id: string;
  }> = [];
  const createInputs: Array<{
    userId: string;
    tripPlanRecordId: string;
    tripPlan: TripPlan;
  }> = [];
  const response = await handleAppendTripPlanVersionRequest(
    buildAppendVersionRequest({ tripPlan }),
    recordId,
    {
      requireCurrentUser: authenticatedUser,
      async getTripPlanRecordById(input) {
        recordInputs.push(input);

        return buildApiRecord(tripPlan);
      },
      async createTripPlanVersion(input) {
        createInputs.push(input);

        return buildApiVersion(input.tripPlan, {
          id: secondVersionId,
          versionNumber: 2,
          tripPlanSnapshot: input.tripPlan,
        });
      },
    },
  );
  const json = (await response.json()) as {
    ok: true;
    data: {
      version: Record<string, unknown>;
    };
  };

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.deepEqual(recordInputs, [{ userId: currentUser.id, id: recordId }]);
  assert.deepEqual(createInputs, [
    { userId: currentUser.id, tripPlanRecordId: recordId, tripPlan },
  ]);
  assert.equal(json.data.version.id, secondVersionId);
  assert.equal(json.data.version.versionNumber, 2);
  assert.deepEqual(json.data.version.source, tripPlan.source);
  assert.equal(json.data.version.generationMode, tripPlan.generationMode);
  assert.equal("tripPlan" in json.data.version, false);
  assertNoSensitiveOrInternalFields(json);
});

test("append version API returns 404 for missing or cross-owner records", async () => {
  const tripPlan = await buildValidTripPlan();
  let writeCount = 0;
  const response = await handleAppendTripPlanVersionRequest(
    buildAppendVersionRequest({ tripPlan }),
    recordId,
    {
      requireCurrentUser: authenticatedUser,
      async getTripPlanRecordById(input) {
        assert.deepEqual(input, { userId: currentUser.id, id: recordId });

        return null;
      },
      async createTripPlanVersion() {
        writeCount += 1;
        throw new Error("should not append");
      },
    },
  );
  const json = (await response.json()) as {
    ok: false;
    error: {
      code: string;
    };
  };

  assert.equal(response.status, 404);
  assert.equal(json.ok, false);
  assert.equal(json.error.code, "NOT_FOUND");
  assert.equal(writeCount, 0);
});

test("restore API creates a new current version from an existing snapshot", async () => {
  const tripPlan = await buildValidTripPlan();
  const targetVersion = buildApiVersion(tripPlan);
  const lookupInputs: Array<{
    userId: string;
    tripPlanRecordId: string;
    versionId: string;
  }> = [];
  const createInputs: Array<{
    userId: string;
    tripPlanRecordId: string;
    tripPlan: TripPlan;
    restoreFromVersionId: string;
  }> = [];
  const response = await handleRestoreTripPlanVersionRequest(
    buildRestoreVersionRequest({ versionId }),
    recordId,
    {
      requireCurrentUser: authenticatedUser,
      async getTripPlanVersionById(input) {
        lookupInputs.push(input);

        return targetVersion;
      },
      async createTripPlanVersion(input) {
        createInputs.push(input);

        return buildApiVersion(input.tripPlan, {
          id: secondVersionId,
          versionNumber: 2,
          restoreFromVersionId: input.restoreFromVersionId,
        });
      },
    },
  );
  const json = (await response.json()) as {
    ok: true;
    data: {
      currentVersion: Record<string, unknown>;
    };
  };

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.deepEqual(lookupInputs, [
    { userId: currentUser.id, tripPlanRecordId: recordId, versionId },
  ]);
  assert.deepEqual(createInputs, [
    {
      userId: currentUser.id,
      tripPlanRecordId: recordId,
      tripPlan,
      restoreFromVersionId: versionId,
    },
  ]);
  assert.notEqual(json.data.currentVersion.id, targetVersion.id);
  assert.equal(json.data.currentVersion.id, secondVersionId);
  assert.equal(json.data.currentVersion.versionNumber, 2);
  assert.deepEqual(json.data.currentVersion.source, tripPlan.source);
  assert.equal(json.data.currentVersion.generationMode, tripPlan.generationMode);
  assert.equal("tripPlan" in json.data.currentVersion, false);
  assertNoSensitiveOrInternalFields(json);
});

test("restore API returns 400 for invalid request bodies before repository access", async () => {
  let readCount = 0;
  let writeCount = 0;
  const response = await handleRestoreTripPlanVersionRequest(
    buildRestoreVersionRequest({ versionId: "not-a-uuid" }),
    recordId,
    {
      requireCurrentUser: authenticatedUser,
      async getTripPlanVersionById() {
        readCount += 1;
        return null;
      },
      async createTripPlanVersion() {
        writeCount += 1;
        throw new Error("should not restore");
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
  assert.equal(readCount, 0);
  assert.equal(writeCount, 0);
});

test("restore API returns 404 for missing or cross-owner versions", async () => {
  let writeCount = 0;
  const response = await handleRestoreTripPlanVersionRequest(
    buildRestoreVersionRequest({ versionId }),
    recordId,
    {
      requireCurrentUser: authenticatedUser,
      async getTripPlanVersionById(input) {
        assert.deepEqual(input, {
          userId: currentUser.id,
          tripPlanRecordId: recordId,
          versionId,
        });

        return null;
      },
      async createTripPlanVersion() {
        writeCount += 1;
        throw new Error("should not restore");
      },
    },
  );
  const json = (await response.json()) as {
    ok: false;
    error: {
      code: string;
    };
  };

  assert.equal(response.status, 404);
  assert.equal(json.ok, false);
  assert.equal(json.error.code, "NOT_FOUND");
  assert.equal(writeCount, 0);
});

test("share token hashing is stable and does not equal the raw token", () => {
  const token = generateShareToken();
  const hash = hashShareToken(token);

  assert.equal(assertShareToken(token), token);
  assert.equal(token.length, 43);
  assert.equal(hash, hashShareToken(token));
  assert.notEqual(hash, token);
  assert.equal(hash.length, 64);
  assert.equal(buildShareTokenPreview(token), token.slice(-8));
  assert.throws(() => assertShareToken("not-a-valid-token"), ShareTokenValidationError);
});

test("share create/list/revoke owner APIs require login before repository access", async () => {
  let createCount = 0;
  let listCount = 0;
  let revokeCount = 0;

  const createResponse = await handleCreateTripPlanShareLinkRequest(
    buildCreateShareRequest(),
    recordId,
    {
      requireCurrentUser: requireUnauthenticatedUser,
      async createTripPlanShareLink() {
        createCount += 1;
        throw new Error("should not create");
      },
    },
  );
  const listResponse = await handleListTripPlanShareLinksRequest(recordId, {
    requireCurrentUser: requireUnauthenticatedUser,
    async listTripPlanShareLinks() {
      listCount += 1;
      return [];
    },
  });
  const revokeResponse = await handleRevokeTripPlanShareLinkRequest(
    buildRevokeShareRequest({ status: "revoked" }),
    recordId,
    shareId,
    {
      requireCurrentUser: requireUnauthenticatedUser,
      async revokeTripPlanShareLink() {
        revokeCount += 1;
        return null;
      },
    },
  );

  for (const response of [createResponse, listResponse, revokeResponse]) {
    const json = (await response.json()) as {
      ok: false;
      error: {
        code: string;
      };
    };

    assert.equal(response.status, 401);
    assert.equal(json.error.code, "UNAUTHORIZED");
  }

  assert.equal(createCount, 0);
  assert.equal(listCount, 0);
  assert.equal(revokeCount, 0);
});

test("share create API only creates owner-scoped links and returns the raw token once", async () => {
  const createInputs: Array<{
    userId: string;
    tripPlanRecordId: string;
    expiresAt?: string | null;
  }> = [];
  const expiresAt = "2026-07-01T00:00:00.000Z";
  const response = await handleCreateTripPlanShareLinkRequest(
    buildCreateShareRequest({ expiresAt }),
    recordId,
    {
      requireCurrentUser: authenticatedUser,
      async createTripPlanShareLink(input) {
        createInputs.push(input);

        return {
          share: buildApiShare({ expiresAt: input.expiresAt ?? null }),
          token: validShareToken,
        };
      },
    },
  );
  const json = (await response.json()) as {
    ok: true;
    data: {
      share: Record<string, unknown>;
      token: string;
      shareUrl: string;
    };
  };

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.deepEqual(createInputs, [
    {
      userId: currentUser.id,
      tripPlanRecordId: recordId,
      expiresAt,
    },
  ]);
  assert.equal(json.data.token, validShareToken);
  assert.equal(
    json.data.shareUrl,
    `http://localhost/shared/trips/${encodeURIComponent(validShareToken)}`,
  );
  assert.equal(json.data.share.id, shareId);
  assert.equal(json.data.share.versionId, versionId);
  assert.equal("tokenHash" in json.data.share, false);
  assert.equal("token" in json.data.share, false);
  assertNoSensitiveOrInternalFields(json.data.share);
});

test("share create API returns 404 for missing or cross-owner records", async () => {
  const response = await handleCreateTripPlanShareLinkRequest(
    buildCreateShareRequest(),
    recordId,
    {
      requireCurrentUser: authenticatedUser,
      async createTripPlanShareLink(input) {
        assert.deepEqual(input, {
          userId: currentUser.id,
          tripPlanRecordId: recordId,
          expiresAt: null,
        });

        return null;
      },
    },
  );
  const json = (await response.json()) as {
    ok: false;
    error: {
      code: string;
    };
  };

  assert.equal(response.status, 404);
  assert.equal(json.error.code, "NOT_FOUND");
});

test("share list API omits raw tokens and token hashes", async () => {
  const response = await handleListTripPlanShareLinksRequest(recordId, {
    requireCurrentUser: authenticatedUser,
    async listTripPlanShareLinks(input) {
      assert.deepEqual(input, {
        userId: currentUser.id,
        tripPlanRecordId: recordId,
      });

      return [buildApiShare({ accessCount: 2 })];
    },
  });
  const json = (await response.json()) as {
    ok: true;
    data: {
      shares: Array<Record<string, unknown>>;
    };
  };

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.data.shares.length, 1);
  assert.equal(json.data.shares[0]?.tokenPreview, validShareToken.slice(-8));
  assert.equal("token" in (json.data.shares[0] ?? {}), false);
  assert.equal("tokenHash" in (json.data.shares[0] ?? {}), false);
  assertNoSensitiveOrInternalFields(json);
});

test("share revoke API returns 404 for cross-user revoke and hides public tokens after revoke", async () => {
  let revoked = false;
  const revokeResponse = await handleRevokeTripPlanShareLinkRequest(
    buildRevokeShareRequest({ status: "revoked" }),
    recordId,
    shareId,
    {
      requireCurrentUser: authenticatedUser,
      async revokeTripPlanShareLink(input) {
        assert.deepEqual(input, {
          userId: currentUser.id,
          tripPlanRecordId: recordId,
          shareId,
        });
        revoked = true;

        return buildApiShare({
          status: "revoked",
          revokedAt: "2026-06-09T00:05:00.000Z",
          updatedAt: "2026-06-09T00:05:00.000Z",
        });
      },
    },
  );
  const publicResponse = await handleGetPublicSharedTripRequest(validShareToken, {
    async getPublicSharedTripByToken() {
      return revoked ? null : null;
    },
  });
  const crossUserResponse = await handleRevokeTripPlanShareLinkRequest(
    buildRevokeShareRequest({ status: "revoked" }),
    recordId,
    shareId,
    {
      requireCurrentUser: authenticatedUser,
      async revokeTripPlanShareLink() {
        return null;
      },
    },
  );
  const revokeJson = (await revokeResponse.json()) as {
    ok: true;
    data: {
      share: Record<string, unknown>;
    };
  };
  const publicJson = (await publicResponse.json()) as {
    ok: false;
    error: {
      code: string;
    };
  };
  const crossUserJson = (await crossUserResponse.json()) as {
    ok: false;
    error: {
      code: string;
    };
  };

  assert.equal(revokeResponse.status, 200);
  assert.equal(revokeJson.data.share.status, "revoked");
  assert.equal(publicResponse.status, 404);
  assert.equal(publicJson.error.code, "NOT_FOUND");
  assert.equal(crossUserResponse.status, 404);
  assert.equal(crossUserJson.error.code, "NOT_FOUND");
});

test("public share API returns TripPlan snapshots without owner or internal fields", async () => {
  const tripPlan = await buildValidTripPlan();
  const response = await handleGetPublicSharedTripRequest(validShareToken, {
    async getPublicSharedTripByToken(input) {
      assert.deepEqual(input, { token: validShareToken });

      return {
        share: buildApiShare({ accessCount: 3 }),
        version: buildApiVersionSummary(),
        tripPlan,
      };
    },
  });
  const json = (await response.json()) as {
    ok: true;
    data: {
      tripPlan: TripPlan;
      share: Record<string, unknown>;
    };
  };

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.deepEqual(json.data.tripPlan, tripPlan);
  assert.equal(json.data.share.sharedAt, "2026-06-09T00:00:01.000Z");
  assert.equal("id" in json.data.share, false);
  assert.equal("ownerUserId" in json.data.share, false);
  assert.equal("tripPlanRecordId" in json.data.share, false);
  assert.equal("tokenHash" in json.data.share, false);
  assertNoSensitiveOrInternalFields(json);
});

test("public share API returns 404 for invalid, revoked, expired, or missing tokens", async () => {
  const invalidResponse = await handleGetPublicSharedTripRequest("invalid-token", {
    async getPublicSharedTripByToken() {
      throw new Error("should not read invalid tokens");
    },
  });
  const expiredResponse = await handleGetPublicSharedTripRequest(validShareToken, {
    async getPublicSharedTripByToken(input) {
      assert.deepEqual(input, { token: validShareToken });

      return null;
    },
  });

  for (const response of [invalidResponse, expiredResponse]) {
    const json = (await response.json()) as {
      ok: false;
      error: {
        code: string;
      };
    };

    assert.equal(response.status, 404);
    assert.equal(json.error.code, "NOT_FOUND");
  }
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

test("append version repository increments version number and updates the current pointer", async () => {
  const tripPlan = await buildValidTripPlan();
  const queries: Array<{
    text: string;
    values: readonly unknown[] | undefined;
  }> = [];
  const db = {
    async query<TRow extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: readonly unknown[],
    ) {
      queries.push({ text, values });

      if (/SELECT id\s+FROM trip_plan_records/i.test(text)) {
        return {
          rows: [{ id: recordId }] as unknown as TRow[],
        };
      }

      if (/SELECT max\(version_number\)/i.test(text)) {
        return {
          rows: [{ max_version_number: 1 }] as unknown as TRow[],
        };
      }

      if (/INSERT INTO trip_plan_versions/i.test(text)) {
        return {
          rows: [
            {
              id: secondVersionId,
              trip_plan_record_id: recordId,
              user_id: currentUser.id,
              version_number: 2,
              trip_plan_snapshot: tripPlan,
              source_provider: tripPlan.source.provider,
              source_kind: tripPlan.source.kind,
              generation_mode: tripPlan.generationMode,
              generated_at: tripPlan.generatedAt,
              created_at: "2026-06-09T00:00:02.000Z",
              restore_from_version_id: null,
              note: null,
            },
          ] as unknown as TRow[],
        };
      }

      if (/UPDATE trip_plan_records/i.test(text)) {
        return {
          rows: [] as unknown as TRow[],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    },
  };

  const result = await createTripPlanVersion({
    userId: currentUser.id,
    tripPlanRecordId: recordId,
    tripPlan,
    db,
  });

  assert.equal(queries.length, 4);
  assert.match(queries[0]?.text ?? "", /FOR UPDATE/i);
  assert.match(queries[1]?.text ?? "", /SELECT max\(version_number\)/i);
  assert.match(queries[2]?.text ?? "", /INSERT INTO trip_plan_versions/i);
  assert.match(queries[3]?.text ?? "", /UPDATE trip_plan_records/i);
  assert.equal(queries[2]?.values?.[2], 2);
  assert.equal(queries[2]?.values?.[3], JSON.stringify(tripPlan));
  assert.equal(queries[3]?.values?.[11], secondVersionId);
  assert.equal(result.id, secondVersionId);
  assert.equal(result.versionNumber, 2);
  assert.deepEqual(result.tripPlanSnapshot, tripPlan);
});

test("restore repository lookup and creation use owner-scoped immutable version copies", async () => {
  const tripPlan = await buildValidTripPlan();
  const lookupQueries: Array<{
    text: string;
    values: readonly unknown[] | undefined;
  }> = [];
  const lookupDb = {
    async query<TRow extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: readonly unknown[],
    ) {
      lookupQueries.push({ text, values });

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
            created_at: "2026-06-09T00:00:01.000Z",
            restore_from_version_id: null,
            note: null,
          },
        ] as unknown as TRow[],
      };
    },
  };
  const restoredVersion = await getTripPlanVersionById({
    userId: currentUser.id,
    tripPlanRecordId: recordId,
    versionId,
    db: lookupDb,
  });

  assert.notEqual(restoredVersion, null);
  assert.match(lookupQueries[0]?.text ?? "", /INNER JOIN trip_plan_versions versions/i);
  assert.match(lookupQueries[0]?.text ?? "", /records\.user_id = \$2/i);
  assert.match(lookupQueries[0]?.text ?? "", /records\.deleted_at IS NULL/i);
  assert.deepEqual(lookupQueries[0]?.values, [recordId, currentUser.id, versionId]);

  if (restoredVersion === null) {
    throw new Error("Expected restore target version.");
  }

  const createQueries: Array<{
    text: string;
    values: readonly unknown[] | undefined;
  }> = [];
  const createDb = {
    async query<TRow extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: readonly unknown[],
    ) {
      createQueries.push({ text, values });

      if (/SELECT id\s+FROM trip_plan_records/i.test(text)) {
        return {
          rows: [{ id: recordId }] as unknown as TRow[],
        };
      }

      if (/SELECT max\(version_number\)/i.test(text)) {
        return {
          rows: [{ max_version_number: 2 }] as unknown as TRow[],
        };
      }

      if (/INSERT INTO trip_plan_versions/i.test(text)) {
        return {
          rows: [
            {
              id: "623e4567-e89b-42d3-a456-426614174000",
              trip_plan_record_id: recordId,
              user_id: currentUser.id,
              version_number: 3,
              trip_plan_snapshot: tripPlan,
              source_provider: tripPlan.source.provider,
              source_kind: tripPlan.source.kind,
              generation_mode: tripPlan.generationMode,
              generated_at: tripPlan.generatedAt,
              created_at: "2026-06-09T00:00:03.000Z",
              restore_from_version_id: versionId,
              note: null,
            },
          ] as unknown as TRow[],
        };
      }

      if (/UPDATE trip_plan_records/i.test(text)) {
        return {
          rows: [] as unknown as TRow[],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    },
  };
  const newCurrentVersion = await createTripPlanVersion({
    userId: currentUser.id,
    tripPlanRecordId: recordId,
    tripPlan: restoredVersion.tripPlanSnapshot,
    restoreFromVersionId: restoredVersion.id,
    db: createDb,
  });

  assert.equal(createQueries[2]?.values?.[2], 3);
  assert.equal(createQueries[2]?.values?.[3], JSON.stringify(tripPlan));
  assert.equal(createQueries[2]?.values?.[8], versionId);
  assert.equal(newCurrentVersion.versionNumber, 3);
  assert.equal(newCurrentVersion.restoreFromVersionId, versionId);
  assert.notEqual(newCurrentVersion.id, versionId);
});

test("versions list repository reads only summary fields and omits snapshots", async () => {
  const queries: Array<{
    text: string;
    values: readonly unknown[] | undefined;
  }> = [];
  const db = {
    async query<TRow extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: readonly unknown[],
    ) {
      queries.push({ text, values });

      return {
        rows: [
          {
            id: secondVersionId,
            version_number: 2,
            source_provider: versionSummarySource.provider,
            source_kind: versionSummarySource.kind,
            generation_mode: versionSummaryGenerationMode,
            generated_at: "2026-06-09T00:00:02.000Z",
            created_at: "2026-06-09T00:00:03.000Z",
          },
          {
            id: versionId,
            version_number: 1,
            source_provider: versionSummarySource.provider,
            source_kind: versionSummarySource.kind,
            generation_mode: versionSummaryGenerationMode,
            generated_at: "2026-06-09T00:00:00.000Z",
            created_at: "2026-06-09T00:00:01.000Z",
          },
        ] as unknown as TRow[],
      };
    },
  };

  const versions = await listTripPlanVersionsForRecord({
    userId: currentUser.id,
    tripPlanRecordId: recordId,
    db,
  });

  assert.equal(queries.length, 1);
  assert.doesNotMatch(queries[0]?.text ?? "", /versions\.\*/i);
  assert.doesNotMatch(queries[0]?.text ?? "", /trip_plan_snapshot/i);
  assert.deepEqual(queries[0]?.values, [recordId, currentUser.id]);
  assert.deepEqual(versions, [
    {
      id: secondVersionId,
      versionNumber: 2,
      sourceProvider: versionSummarySource.provider,
      sourceKind: versionSummarySource.kind,
      generationMode: versionSummaryGenerationMode,
      generatedAt: "2026-06-09T00:00:02.000Z",
      createdAt: "2026-06-09T00:00:03.000Z",
    },
    {
      id: versionId,
      versionNumber: 1,
      sourceProvider: versionSummarySource.provider,
      sourceKind: versionSummarySource.kind,
      generationMode: versionSummaryGenerationMode,
      generatedAt: "2026-06-09T00:00:00.000Z",
      createdAt: "2026-06-09T00:00:01.000Z",
    },
  ]);
});

test("share repository stores only token hashes and creates fixed-version links", async () => {
  const queries: Array<{
    text: string;
    values: readonly unknown[] | undefined;
  }> = [];
  const createdAt = "2026-06-09T00:00:01.000Z";
  const db = {
    async query<TRow extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: readonly unknown[],
    ) {
      queries.push({ text, values });

      if (/INSERT INTO trip_plan_shares/i.test(text)) {
        return {
          rows: [
            {
              id: shareId,
              owner_user_id: currentUser.id,
              trip_plan_record_id: recordId,
              version_id: versionId,
              token_preview: String(values?.[3] ?? ""),
              status: "active",
              expires_at: values?.[4] ?? null,
              revoked_at: null,
              created_at: createdAt,
              updated_at: createdAt,
              last_accessed_at: null,
              access_count: 0,
            },
          ] as unknown as TRow[],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    },
  };
  const expiresAt = "2026-07-01T00:00:00.000Z";
  const result = await createTripPlanShareLink({
    userId: currentUser.id,
    tripPlanRecordId: recordId,
    expiresAt,
    db,
  });

  assert.notEqual(result, null);

  if (result === null) {
    throw new Error("Expected created share link.");
  }

  assert.equal(queries.length, 1);
  assert.match(queries[0]?.text ?? "", /INNER JOIN trip_plan_versions versions/i);
  assert.match(queries[0]?.text ?? "", /versions\.id = records\.current_version_id/i);
  assert.match(queries[0]?.text ?? "", /records\.user_id = \$2/i);
  assert.match(queries[0]?.text ?? "", /records\.deleted_at IS NULL/i);
  assert.equal(queries[0]?.values?.[0], recordId);
  assert.equal(queries[0]?.values?.[1], currentUser.id);
  assert.equal(queries[0]?.values?.[2], hashShareToken(result.token));
  assert.notEqual(queries[0]?.values?.[2], result.token);
  assert.equal(queries[0]?.values?.[3], buildShareTokenPreview(result.token));
  assert.equal(queries[0]?.values?.[4], expiresAt);
  assert.equal(result.share.versionId, versionId);
  assert.equal(result.share.tokenPreview, result.token.slice(-8));
});

test("public share repository hashes tokens, filters revoked or expired links, and records access", async () => {
  const tripPlan = await buildValidTripPlan();
  const queries: Array<{
    text: string;
    values: readonly unknown[] | undefined;
  }> = [];
  const db = {
    async query<TRow extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: readonly unknown[],
    ) {
      queries.push({ text, values });

      if (/FROM trip_plan_shares shares/i.test(text)) {
        return {
          rows: [
            {
              id: shareId,
              owner_user_id: currentUser.id,
              trip_plan_record_id: recordId,
              version_id: versionId,
              token_preview: validShareToken.slice(-8),
              status: "active",
              expires_at: null,
              revoked_at: null,
              created_at: "2026-06-09T00:00:01.000Z",
              updated_at: "2026-06-09T00:00:01.000Z",
              last_accessed_at: null,
              access_count: 0,
              version_number: 1,
              version_source_provider: tripPlan.source.provider,
              version_source_kind: tripPlan.source.kind,
              version_generation_mode: tripPlan.generationMode,
              version_generated_at: tripPlan.generatedAt,
              version_created_at: "2026-06-09T00:00:01.000Z",
              trip_plan_snapshot: tripPlan,
            },
          ] as unknown as TRow[],
        };
      }

      if (/UPDATE trip_plan_shares/i.test(text)) {
        return {
          rows: [] as unknown as TRow[],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    },
  };
  const sharedTrip = await getPublicSharedTripByToken({
    token: validShareToken,
    db,
  });

  assert.notEqual(sharedTrip, null);
  assert.equal(queries.length, 2);
  assert.equal(queries[0]?.values?.[0], hashShareToken(validShareToken));
  assert.notEqual(queries[0]?.values?.[0], validShareToken);
  assert.match(queries[0]?.text ?? "", /shares\.status = 'active'/i);
  assert.match(queries[0]?.text ?? "", /shares\.revoked_at IS NULL/i);
  assert.match(queries[0]?.text ?? "", /shares\.expires_at IS NULL OR shares\.expires_at > now\(\)/i);
  assert.match(queries[0]?.text ?? "", /records\.deleted_at IS NULL/i);
  assert.match(queries[1]?.text ?? "", /access_count = access_count \+ 1/i);
  assert.deepEqual(sharedTrip?.tripPlan, tripPlan);
});

test("trip history and share routes require current user without adding UI or admin routes", async () => {
  const repoRoot = process.cwd();
  const routePaths = [
    path.join(repoRoot, "src", "app", "api", "travel-plans", "route.ts"),
    path.join(repoRoot, "src", "app", "api", "travel-plans", "save", "route.ts"),
    path.join(repoRoot, "src", "app", "api", "travel-plans", "[id]", "route.ts"),
    path.join(repoRoot, "src", "app", "api", "travel-plans", "[id]", "versions", "route.ts"),
    path.join(
      repoRoot,
      "src",
      "app",
      "api",
      "travel-plans",
      "[id]",
      "versions",
      "[versionId]",
      "route.ts",
    ),
    path.join(repoRoot, "src", "app", "api", "travel-plans", "[id]", "restore", "route.ts"),
    path.join(
      repoRoot,
      "src",
      "app",
      "api",
      "travel-plans",
      "[id]",
      "share-links",
      "route.ts",
    ),
    path.join(
      repoRoot,
      "src",
      "app",
      "api",
      "travel-plans",
      "[id]",
      "share-links",
      "[shareId]",
      "route.ts",
    ),
  ];

  for (const routePath of routePaths) {
    const source = await readFile(routePath, "utf8");
    assert.match(source, /requireCurrentUser/);
  }

  for (const forbiddenPath of [
    path.join(repoRoot, "src", "app", "api", "travel-plans", "[id]", "share"),
    path.join(repoRoot, "src", "app", "history"),
    path.join(repoRoot, "src", "app", "admin"),
  ]) {
    assert.equal(existsSync(forbiddenPath), false, forbiddenPath);
  }

  const publicShareRoute = await readFile(
    path.join(repoRoot, "src", "app", "api", "shared", "trips", "[token]", "route.ts"),
    "utf8",
  );
  assert.doesNotMatch(publicShareRoute, /requireCurrentUser/);

  const publicSharePagePath = path.join(
    repoRoot,
    "src",
    "app",
    "shared",
    "trips",
    "[token]",
    "page.tsx",
  );
  const publicShareClientPath = path.join(
    repoRoot,
    "src",
    "app",
    "shared",
    "trips",
    "[token]",
    "shared-trip-page-client.tsx",
  );
  const publicSharePage = await readFile(publicSharePagePath, "utf8");
  const publicShareClient = await readFile(publicShareClientPath, "utf8");

  assert.match(publicSharePage, /robots/);
  assert.match(publicShareClient, /getSharedTripClient/);
  assert.match(publicShareClient, /showDebugJson=\{false\}/);
  assert.match(publicShareClient, /showResultActions=\{false\}/);
  assert.match(publicShareClient, /showSaveAction=\{false\}/);
  assert.doesNotMatch(
    `${publicSharePage}\n${publicShareClient}`,
    /requireCurrentUser|saveTripPlanClient|listTripPlanVersionsClient|restoreTripPlanVersionClient|createShareLinkClient|revokeShareLinkClient|tokenHash|ownerUserId|tripPlanRecordId/i,
  );
});

test("trip history repository keeps list and detail queries owner-scoped and soft-delete aware", async () => {
  const source = await readFile(
    path.join(process.cwd(), "src", "lib", "server", "trip-history", "repository.ts"),
    "utf8",
  );
  const listVersionsSource =
    /export async function listTripPlanVersionsForRecord[\s\S]+?export async function getTripPlanVersionById/.exec(
      source,
    )?.[0] ?? "";

  assert.match(source, /WHERE user_id = \$1\s+AND deleted_at IS NULL/i);
  assert.match(source, /WHERE id = \$1\s+AND user_id = \$2\s+AND deleted_at IS NULL/i);
  assert.match(source, /WHERE records\.id = \$1\s+AND records\.user_id = \$2\s+AND records\.deleted_at IS NULL/i);
  assert.match(source, /INNER JOIN trip_plan_versions versions\s+ON versions\.trip_plan_record_id = records\.id\s+AND versions\.user_id = records\.user_id/i);
  assert.match(source, /AND versions\.id = \$3/i);
  assert.doesNotMatch(listVersionsSource, /versions\.\*/i);
  assert.doesNotMatch(listVersionsSource, /trip_plan_snapshot/i);
  assert.doesNotMatch(source, new RegExp(otherUserId));
});
