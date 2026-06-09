import assert from "node:assert/strict";
import test from "node:test";

import { mockTripPlan } from "@/lib/mock/mock-trip-plan";
import type {
  SavedTripPlanVersionDetail,
  SavedTripPlanVersionSummary,
} from "@/lib/services/trip-history-client";
import {
  buildTripPlanVersionListItemView,
  buildTripPlanVersionPreviewView,
  buildTripPlanVersionRestoreConfirmMessage,
  buildTripPlanVersionRestoreErrorView,
  buildTripPlanVersionRestoreSuccessView,
} from "@/lib/services/trip-version-history-view";

const versionId = "423e4567-e89b-42d3-a456-426614174000";
const safeVersion: SavedTripPlanVersionSummary = {
  id: versionId,
  versionNumber: 2,
  source: {
    provider: "mock",
    kind: "mock",
  },
  generationMode: "quick",
  generatedAt: mockTripPlan.generatedAt,
  createdAt: "2026-06-09T00:00:01.000Z",
};

function assertNoSensitiveText(value: unknown) {
  assert.doesNotMatch(
    JSON.stringify(value),
    /userId|tripPlanRecordId|restoreFromVersionId|DATABASE_URL|AUTH_SECRET|OAuth secret|API Key|Bearer|Authorization|SQL|stack/i,
  );
}

test("trip version list item view marks the current version and keeps restore disabled", () => {
  const view = buildTripPlanVersionListItemView(safeVersion, safeVersion.versionNumber);

  assert.equal(view.versionLabel, "v2");
  assert.equal(view.sourceLabel, "Mock 草稿 · 本地 mock");
  assert.equal(view.isCurrent, true);
  assert.equal(view.currentLabel, "当前版本");
  assert.equal(view.restoreButtonLabel, "当前版本");
  assert.equal(view.restoreButtonDisabled, true);
  assertNoSensitiveText(view);
});

test("trip version preview and restore views use safe fixed wording", () => {
  const detail: SavedTripPlanVersionDetail = {
    ...safeVersion,
    tripPlan: mockTripPlan,
  };
  const preview = buildTripPlanVersionPreviewView(detail);
  const confirmMessage = buildTripPlanVersionRestoreConfirmMessage(safeVersion);
  const success = buildTripPlanVersionRestoreSuccessView({
    ...safeVersion,
    versionNumber: 3,
  });
  const error = buildTripPlanVersionRestoreErrorView("历史行程服务暂时不可用，请稍后重试。");

  assert.equal(preview.title, "历史版本预览");
  assert.match(preview.description, /不会替换当前行程/);
  assert.match(preview.description, /不会覆盖旧版本/);
  assert.match(confirmMessage, /恢复会创建一个新版本/);
  assert.match(success.message, /旧版本仍会保留/);
  assert.equal(error.tone, "error");
  assertNoSensitiveText({ preview, confirmMessage, success, error });
});
