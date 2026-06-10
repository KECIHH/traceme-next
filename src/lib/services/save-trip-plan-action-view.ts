import type {
  SavedTripPlanSaveData,
  SaveTripPlanClientError,
} from "@/lib/services/save-trip-plan-client";

export type SaveTripPlanActionState =
  | {
      status: "idle";
    }
  | {
      status: "saving";
    }
  | {
      status: "saved";
      data: SavedTripPlanSaveData;
    }
  | {
      status: "error";
      error: SaveTripPlanClientError;
    };

export type ScopedSaveTripPlanActionState =
  | {
      status: "idle";
    }
  | (Exclude<SaveTripPlanActionState, { status: "idle" }> & {
      snapshotKey: string;
    });

export type SaveTripPlanSettledActionState =
  | Extract<SaveTripPlanActionState, { status: "saved" }>
  | Extract<SaveTripPlanActionState, { status: "error" }>;

export type SaveTripPlanActionView = {
  buttonLabel: string;
  buttonDisabled: boolean;
  feedback:
    | {
        tone: "success" | "error";
        message: string;
      }
    | null;
  detailLink: string | null;
  listLink: string | null;
  loginLink:
    | {
        href: string;
        target: "_blank";
        rel: "noreferrer";
        label: string;
      }
    | null;
};

export function getEffectiveSaveTripPlanActionState(
  state: ScopedSaveTripPlanActionState,
  snapshotKey: string,
): SaveTripPlanActionState {
  if (state.status === "idle" || state.snapshotKey === snapshotKey) {
    return state;
  }

  return { status: "idle" };
}

export function buildSavingSaveTripPlanActionState(
  snapshotKey: string,
): ScopedSaveTripPlanActionState {
  return {
    status: "saving",
    snapshotKey,
  };
}

export function settleSaveTripPlanActionState(
  currentState: ScopedSaveTripPlanActionState,
  requestSnapshotKey: string,
  settledState: SaveTripPlanSettledActionState,
): ScopedSaveTripPlanActionState {
  if (
    currentState.status !== "saving" ||
    currentState.snapshotKey !== requestSnapshotKey
  ) {
    return currentState;
  }

  return {
    ...settledState,
    snapshotKey: requestSnapshotKey,
  };
}

export function buildSaveTripPlanActionView(
  state: SaveTripPlanActionState,
): SaveTripPlanActionView {
  switch (state.status) {
    case "saving":
      return {
        buttonLabel: "正在保存...",
        buttonDisabled: true,
        feedback: null,
        detailLink: null,
        listLink: null,
        loginLink: null,
      };
    case "saved":
      return {
        buttonLabel: "已保存",
        buttonDisabled: true,
        feedback: {
          tone: "success",
          message: "已保存到我的行程。现在可以查看详情或回到我的行程列表。",
        },
        detailLink: `/trips/${state.data.record.id}`,
        listLink: "/trips",
        loginLink: null,
      };
    case "error":
      return {
        buttonLabel: "保存到我的行程",
        buttonDisabled: false,
        feedback: {
          tone: "error",
          message:
            state.error.kind === "unauthorized"
              ? "请先登录后保存。当前结果仍保留在本页；登录后回到这个标签页再次点击保存。"
              : state.error.message,
        },
        detailLink: null,
        listLink: null,
        loginLink:
          state.error.kind === "unauthorized"
            ? {
                href: `/api/auth/signin?callbackUrl=${encodeURIComponent("/")}`,
                target: "_blank",
                rel: "noreferrer",
                label: "新标签页登录",
              }
            : null,
      };
    case "idle":
      return {
        buttonLabel: "保存到我的行程",
        buttonDisabled: false,
        feedback: null,
        detailLink: null,
        listLink: null,
        loginLink: null,
      };
  }
}
