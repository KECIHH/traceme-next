import type {
  SavedTripPlanVersionDetail,
  SavedTripPlanVersionSummary,
} from "@/lib/services/trip-history-client";
import { getSavedTripPlanSourceLabel } from "@/lib/services/trip-history-client";

export type TripPlanVersionListItemView = {
  id: string;
  versionLabel: string;
  sourceLabel: string;
  createdAt: string;
  generatedAt: string;
  isCurrent: boolean;
  currentLabel: string | null;
  previewButtonLabel: string;
  restoreButtonLabel: string;
  restoreButtonDisabled: boolean;
};

export type TripPlanVersionPreviewView = {
  title: string;
  description: string;
  versionLabel: string;
  sourceLabel: string;
};

export type TripPlanVersionRestoreFeedbackView = {
  tone: "success" | "error";
  message: string;
};

export function buildTripPlanVersionListItemView(
  version: SavedTripPlanVersionSummary,
  currentVersionNumber: number,
): TripPlanVersionListItemView {
  const isCurrent = version.versionNumber === currentVersionNumber;

  return {
    id: version.id,
    versionLabel: `v${version.versionNumber}`,
    sourceLabel: getSavedTripPlanSourceLabel(version.source),
    createdAt: version.createdAt,
    generatedAt: version.generatedAt,
    isCurrent,
    currentLabel: isCurrent ? "当前版本" : null,
    previewButtonLabel: "查看快照",
    restoreButtonLabel: isCurrent ? "当前版本" : "恢复此版本",
    restoreButtonDisabled: isCurrent,
  };
}

export function buildTripPlanVersionPreviewView(
  version: SavedTripPlanVersionDetail,
): TripPlanVersionPreviewView {
  return {
    title: "历史版本预览",
    description:
      "这是历史版本快照预览。预览不会替换当前行程；恢复会创建一个新版本，不会覆盖旧版本。",
    versionLabel: `v${version.versionNumber}`,
    sourceLabel: getSavedTripPlanSourceLabel(version.source),
  };
}

export function buildTripPlanVersionRestoreConfirmMessage(
  version: SavedTripPlanVersionSummary,
) {
  return `确认恢复 v${version.versionNumber} 吗？恢复会创建一个新版本，不会覆盖旧版本。`;
}

export function buildTripPlanVersionRestoreSuccessView(
  currentVersion: SavedTripPlanVersionSummary,
): TripPlanVersionRestoreFeedbackView {
  return {
    tone: "success",
    message: `已恢复为新的 v${currentVersion.versionNumber}。旧版本仍会保留在版本历史中。`,
  };
}

export function buildTripPlanVersionRestoreErrorView(
  message: string,
): TripPlanVersionRestoreFeedbackView {
  return {
    tone: "error",
    message,
  };
}
