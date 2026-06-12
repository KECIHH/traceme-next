import type { SavedTripPlanShareSummary } from "@/lib/services/trip-history-client";

export const PUBLIC_SHARE_UNAVAILABLE_MESSAGE = "分享链接不可用或已失效";
export const PUBLIC_SHARE_UNAVAILABLE_DETAIL_MESSAGE =
  "该链接可能不存在、已撤销、已过期，或对应行程暂不可分享。为保护行程隐私，页面不会区分具体原因；如果这是恢复后的旧链接，请让所有者重新创建分享链接。";

export type ShareFeedbackView = {
  tone: "success" | "error";
  message: string;
};

export type ShareLinkSummaryView = {
  tokenPreviewLabel: string;
  statusLabel: string;
  statusTone: "active" | "revoked";
  versionLabel: string;
  createdAtLabel: string;
  expiresAtLabel: string;
  revokedAtLabel: string | null;
  canRevoke: boolean;
};

function formatDateTime(value: string | null) {
  if (value === null) {
    return "未设置";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function buildShareLinkSummaryView(
  share: SavedTripPlanShareSummary,
): ShareLinkSummaryView {
  const isRevoked = share.status === "revoked";

  return {
    tokenPreviewLabel: `链接尾号 ${share.tokenPreview}`,
    statusLabel: isRevoked ? "已撤销" : "可访问",
    statusTone: isRevoked ? "revoked" : "active",
    versionLabel: "创建时的固定快照",
    createdAtLabel: formatDateTime(share.createdAt),
    expiresAtLabel:
      share.expiresAt === null ? "不自动失效" : formatDateTime(share.expiresAt),
    revokedAtLabel: share.revokedAt === null ? null : formatDateTime(share.revokedAt),
    canRevoke: !isRevoked,
  };
}

export function buildShareLinkRevokeConfirmMessage(
  share: SavedTripPlanShareSummary,
) {
  return `确定撤销链接尾号 ${share.tokenPreview} 的分享链接吗？撤销后，持有该链接的人将无法继续查看这份行程。`;
}

export function buildShareLinkCreateSuccessFeedback(): ShareFeedbackView {
  return {
    tone: "success",
    message: "已创建分享链接。完整链接只显示一次，请现在复制保存。",
  };
}

export function buildShareLinkCopySuccessFeedback(): ShareFeedbackView {
  return {
    tone: "success",
    message: "已复制分享链接。",
  };
}

export function buildShareLinkManualCopyFeedback(): ShareFeedbackView {
  return {
    tone: "success",
    message: "自动复制失败，已展开完整链接，可手动复制。",
  };
}

export function buildShareLinkRevokeSuccessFeedback(): ShareFeedbackView {
  return {
    tone: "success",
    message:
      "已撤销分享链接。持有旧链接的人会看到统一不可用提示，无法继续访问这份行程。",
  };
}

export function buildShareLinkErrorFeedback(message: string): ShareFeedbackView {
  return {
    tone: "error",
    message,
  };
}

export function buildPublicShareUnavailableMessage() {
  return PUBLIC_SHARE_UNAVAILABLE_MESSAGE;
}

export function buildPublicShareUnavailableDetailMessage() {
  return PUBLIC_SHARE_UNAVAILABLE_DETAIL_MESSAGE;
}
