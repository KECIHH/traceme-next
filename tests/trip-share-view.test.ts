import assert from "node:assert/strict";
import test from "node:test";

import type {
  SavedTripPlanShareSummary,
  TripHistoryClientError,
} from "@/lib/services/trip-history-client";
import {
  PUBLIC_SHARE_UNAVAILABLE_MESSAGE,
  buildPublicShareUnavailableMessage,
  buildShareLinkCopySuccessFeedback,
  buildShareLinkCreateSuccessFeedback,
  buildShareLinkManualCopyFeedback,
  buildShareLinkRevokeConfirmMessage,
  buildShareLinkRevokeSuccessFeedback,
  buildShareLinkSummaryView,
} from "@/lib/services/trip-share-view";

const share: SavedTripPlanShareSummary = {
  id: "723e4567-e89b-42d3-a456-426614174000",
  tokenPreview: "aaaaaaaa",
  status: "active",
  versionId: "423e4567-e89b-42d3-a456-426614174000",
  expiresAt: null,
  revokedAt: null,
  createdAt: "2026-06-09T00:00:01.000Z",
  updatedAt: "2026-06-09T00:00:01.000Z",
};

const uuidPattern =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

function assertNoSensitiveText(value: unknown) {
  assert.doesNotMatch(
    JSON.stringify(value),
    /tokenHash|plain token|raw token|userId|ownerUserId|tripPlanRecordId|DATABASE_URL|AUTH_SECRET|OAuth secret|API Key|Bearer|Authorization|SQL|stack/i,
  );
}

test("share link view exposes safe owner summary and revoke copy", () => {
  const activeView = buildShareLinkSummaryView(share);
  const revokedView = buildShareLinkSummaryView({
    ...share,
    status: "revoked",
    revokedAt: "2026-06-09T00:05:00.000Z",
  });
  const confirmMessage = buildShareLinkRevokeConfirmMessage(share);

  assert.equal(activeView.tokenPreviewLabel, "链接尾号 aaaaaaaa");
  assert.equal(activeView.statusLabel, "可访问");
  assert.equal(activeView.versionLabel, "创建时的固定快照");
  assert.equal(activeView.expiresAtLabel, "不自动失效");
  assert.equal(activeView.canRevoke, true);
  assert.doesNotMatch(JSON.stringify(activeView), uuidPattern);
  assert.equal(revokedView.statusLabel, "已撤销");
  assert.equal(revokedView.canRevoke, false);
  assert.match(confirmMessage, /撤销后/);
  assertNoSensitiveText({ activeView, revokedView, confirmMessage });
});

test("share feedback copy stays fixed and safe", () => {
  const feedback = [
    buildShareLinkCreateSuccessFeedback(),
    buildShareLinkCopySuccessFeedback(),
    buildShareLinkManualCopyFeedback(),
    buildShareLinkRevokeSuccessFeedback(),
  ];

  assert.match(feedback[0]?.message ?? "", /只显示一次/);
  assert.match(feedback[2]?.message ?? "", /手动复制/);
  assertNoSensitiveText(feedback);
});

test("public share unavailable text is unified for revoked, expired, and not found", () => {
  const errors: TripHistoryClientError[] = [
    {
      kind: "not_found",
      message: "not found",
      status: 404,
    },
    {
      kind: "server_error",
      message: "expired",
      status: 500,
    },
    {
      kind: "invalid_response",
      message: "revoked",
      status: 404,
    },
  ];

  for (const error of errors) {
    assert.equal(buildPublicShareUnavailableMessage(), PUBLIC_SHARE_UNAVAILABLE_MESSAGE);
    assert.equal(error.status === undefined || error.status >= 400, true);
  }

  assert.equal(PUBLIC_SHARE_UNAVAILABLE_MESSAGE, "分享链接不可用或已失效");
  assertNoSensitiveText(PUBLIC_SHARE_UNAVAILABLE_MESSAGE);
});
