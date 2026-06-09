"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { TripPlanResult } from "@/components/trip/trip-plan-result";
import {
  getSavedTripPlanDetail,
  getSavedTripPlanSourceLabel,
  getTripPlanVersionClient,
  listTripPlanVersionsClient,
  restoreTripPlanVersionClient,
  type SavedTripPlanDetail,
  type SavedTripPlanVersionDetail,
  type SavedTripPlanVersionSummary,
  type TripHistoryClientError,
} from "@/lib/services/trip-history-client";
import {
  buildTripPlanVersionListItemView,
  buildTripPlanVersionPreviewView,
  buildTripPlanVersionRestoreConfirmMessage,
  buildTripPlanVersionRestoreErrorView,
  buildTripPlanVersionRestoreSuccessView,
  type TripPlanVersionRestoreFeedbackView,
} from "@/lib/services/trip-version-history-view";

type TripDetailState =
  | {
      status: "loading";
    }
  | {
      status: "success";
      detail: SavedTripPlanDetail;
    }
  | {
      status: "error";
      error: TripHistoryClientError;
    };

type TripVersionsState =
  | {
      status: "loading";
    }
  | {
      status: "success";
      versions: SavedTripPlanVersionSummary[];
    }
  | {
      status: "error";
      error: TripHistoryClientError;
    };

type VersionPreviewState =
  | {
      status: "idle";
    }
  | {
      status: "loading";
      versionId: string;
    }
  | {
      status: "success";
      version: SavedTripPlanVersionDetail;
    }
  | {
      status: "error";
      error: TripHistoryClientError;
    };

function formatDateTime(value: string) {
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

function formatDays(days: number | null) {
  return days === null ? "天数待确认" : `${days} 天`;
}

function LoginGuide({ id }: { id: string }) {
  const callbackUrl = `/trips/${id}`;

  return (
    <section className="rounded-md border border-emerald-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-emerald-700">需要登录</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
        登录后查看行程详情
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        行程详情只会通过受保护 API 加载当前登录账号自己的保存快照。未登录时不会展示历史数据。
      </p>
      <a
        href={`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        className="mt-5 inline-flex rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        登录
      </a>
    </section>
  );
}

function ErrorState({ error }: { error: TripHistoryClientError }) {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 p-5">
      <p className="text-sm font-semibold text-red-900">
        {error.kind === "not_found" ? "没有找到这份行程" : "无法加载行程详情"}
      </p>
      <p className="mt-2 text-sm leading-6 text-red-800">{error.message}</p>
    </section>
  );
}

function DetailSummary({ detail }: { detail: SavedTripPlanDetail }) {
  const { record, currentVersion } = detail;

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-700">
            {getSavedTripPlanSourceLabel(record.source)}
          </p>
          <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            {record.title}
          </h1>
          <p className="mt-3 break-words text-sm leading-6 text-zinc-600">
            {record.departureCity} → {record.destination}
          </p>
        </div>
        <Link
          href="/trips"
          className="shrink-0 rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          返回我的行程
        </Link>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-md bg-zinc-50 p-3">
          <dt className="font-medium text-zinc-500">出发 / 返回日期</dt>
          <dd className="mt-1 break-words font-semibold text-zinc-900">
            {record.startDate} 至 {record.endDate}
          </dd>
        </div>
        <div className="rounded-md bg-zinc-50 p-3">
          <dt className="font-medium text-zinc-500">天数</dt>
          <dd className="mt-1 font-semibold text-zinc-900">{formatDays(record.days)}</dd>
        </div>
        <div className="rounded-md bg-zinc-50 p-3">
          <dt className="font-medium text-zinc-500">创建时间</dt>
          <dd className="mt-1 break-words font-semibold text-zinc-900">
            {formatDateTime(record.createdAt)}
          </dd>
        </div>
        <div className="rounded-md bg-zinc-50 p-3">
          <dt className="font-medium text-zinc-500">更新时间</dt>
          <dd className="mt-1 break-words font-semibold text-zinc-900">
            {formatDateTime(record.updatedAt)}
          </dd>
        </div>
        <div className="rounded-md bg-zinc-50 p-3">
          <dt className="font-medium text-zinc-500">快照生成时间</dt>
          <dd className="mt-1 break-words font-semibold text-zinc-900">
            {formatDateTime(currentVersion.generatedAt)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function VersionHistoryErrorState({ error }: { error: TripHistoryClientError }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-900">无法加载版本历史</p>
      <p className="mt-2 text-sm leading-6 text-red-800">{error.message}</p>
    </div>
  );
}

function VersionHistoryPanel({
  detail,
  versionsState,
  previewState,
  restoreFeedback,
  restoringVersionId,
  onPreview,
  onRestore,
}: {
  detail: SavedTripPlanDetail;
  versionsState: TripVersionsState;
  previewState: VersionPreviewState;
  restoreFeedback: TripPlanVersionRestoreFeedbackView | null;
  restoringVersionId: string | null;
  onPreview(version: SavedTripPlanVersionSummary): void;
  onRestore(version: SavedTripPlanVersionSummary): void;
}) {
  const currentVersionNumber = detail.currentVersion.versionNumber;

  return (
    <section
      className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm"
      data-print-hidden="true"
      aria-label="版本历史"
    >
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-700">版本历史</p>
          <h2 className="mt-2 break-words text-2xl font-semibold tracking-tight text-zinc-950">
            查看与恢复保存快照
          </h2>
          <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-zinc-600">
            恢复历史版本会创建一个新版本，不会覆盖旧版本。这里不提供版本 diff、分享或管理后台入口。
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
          当前 v{currentVersionNumber}
        </span>
      </div>

      {restoreFeedback ? (
        <p
          aria-live="polite"
          className={`mt-4 break-words rounded-md px-3 py-2 text-sm leading-6 ${
            restoreFeedback.tone === "success"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-red-50 text-red-800 ring-1 ring-red-200"
          }`}
        >
          {restoreFeedback.message}
        </p>
      ) : null}

      <div className="mt-5">
        {versionsState.status === "loading" ? (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm leading-6 text-zinc-600">正在加载版本历史...</p>
          </div>
        ) : null}

        {versionsState.status === "error" ? (
          <VersionHistoryErrorState error={versionsState.error} />
        ) : null}

        {versionsState.status === "success" ? (
          <div className="space-y-3">
            {versionsState.versions.map((version) => {
              const view = buildTripPlanVersionListItemView(
                version,
                currentVersionNumber,
              );
              const isPreviewLoading =
                previewState.status === "loading" && previewState.versionId === version.id;
              const isRestoring = restoringVersionId === version.id;
              const disableRestore =
                view.restoreButtonDisabled || restoringVersionId !== null;

              return (
                <article
                  key={version.id}
                  className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-zinc-950">
                          {view.versionLabel}
                        </h3>
                        {view.currentLabel ? (
                          <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900">
                            {view.currentLabel}
                          </span>
                        ) : null}
                      </div>
                      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="font-medium text-zinc-500">创建时间</dt>
                          <dd className="mt-1 break-words text-zinc-800">
                            {formatDateTime(view.createdAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-zinc-500">生成时间</dt>
                          <dd className="mt-1 break-words text-zinc-800">
                            {formatDateTime(view.generatedAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-zinc-500">来源摘要</dt>
                          <dd className="mt-1 break-words text-zinc-800">
                            {view.sourceLabel}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => onPreview(version)}
                        disabled={isPreviewLoading}
                        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                      >
                        {isPreviewLoading ? "正在加载..." : view.previewButtonLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRestore(version)}
                        disabled={disableRestore}
                        className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-400"
                      >
                        {isRestoring ? "正在恢复..." : view.restoreButtonLabel}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        {previewState.status === "loading" ? (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm leading-6 text-zinc-600">正在加载历史版本快照...</p>
          </div>
        ) : null}

        {previewState.status === "error" ? (
          <VersionHistoryErrorState error={previewState.error} />
        ) : null}
      </div>
    </section>
  );
}

function VersionPreview({ version }: { version: SavedTripPlanVersionDetail }) {
  const view = buildTripPlanVersionPreviewView(version);

  return (
    <section className="space-y-4" aria-label="历史版本预览">
      <div
        className="rounded-md border border-amber-200 bg-amber-50 p-4"
        data-print-hidden="true"
      >
        <p className="text-sm font-semibold text-amber-900">
          {view.title} · {view.versionLabel}
        </p>
        <p className="mt-2 break-words text-sm leading-6 text-amber-900">
          {view.description}
        </p>
        <p className="mt-2 break-words text-sm leading-6 text-amber-900">
          来源摘要：{view.sourceLabel}
        </p>
      </div>
      <TripPlanResult
        tripPlan={version.tripPlan}
        showDebugJson={false}
        showResultActions={false}
      />
    </section>
  );
}

export function TripDetailPageClient({ id }: { id: string }) {
  const [detailState, setDetailState] = useState<TripDetailState>({ status: "loading" });
  const [versionsState, setVersionsState] = useState<TripVersionsState>({
    status: "loading",
  });
  const [previewState, setPreviewState] = useState<VersionPreviewState>({
    status: "idle",
  });
  const [restoreFeedback, setRestoreFeedback] =
    useState<TripPlanVersionRestoreFeedbackView | null>(null);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

  const loadTripDetail = useCallback(async () => {
    const result = await getSavedTripPlanDetail(id);

    if (result.ok) {
      setDetailState({
        status: "success",
        detail: result.data,
      });
      return result.data;
    }

    setDetailState({
      status: "error",
      error: result.error,
    });
    return null;
  }, [id]);

  const loadVersions = useCallback(async () => {
    setVersionsState({ status: "loading" });

    const result = await listTripPlanVersionsClient(id);

    if (result.ok) {
      setVersionsState({
        status: "success",
        versions: result.data.versions,
      });
      return;
    }

    setVersionsState({
      status: "error",
      error: result.error,
    });
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setDetailState({ status: "loading" });
      setVersionsState({ status: "loading" });
      setPreviewState({ status: "idle" });
      setRestoreFeedback(null);
      setRestoringVersionId(null);

      const result = await getSavedTripPlanDetail(id);

      if (!isMounted) {
        return;
      }

      if (result.ok) {
        setDetailState({
          status: "success",
          detail: result.data,
        });

        const versionsResult = await listTripPlanVersionsClient(id);

        if (!isMounted) {
          return;
        }

        if (versionsResult.ok) {
          setVersionsState({
            status: "success",
            versions: versionsResult.data.versions,
          });
          return;
        }

        setVersionsState({
          status: "error",
          error: versionsResult.error,
        });
        return;
      }

      setDetailState({
        status: "error",
        error: result.error,
      });
      setVersionsState({
        status: "error",
        error: result.error,
      });
    }

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, [id]);

  async function handlePreview(version: SavedTripPlanVersionSummary) {
    setRestoreFeedback(null);
    setPreviewState({
      status: "loading",
      versionId: version.id,
    });

    const result = await getTripPlanVersionClient(id, version.id);

    if (result.ok) {
      setPreviewState({
        status: "success",
        version: result.data,
      });
      return;
    }

    setPreviewState({
      status: "error",
      error: result.error,
    });
  }

  async function handleRestore(version: SavedTripPlanVersionSummary) {
    if (!window.confirm(buildTripPlanVersionRestoreConfirmMessage(version))) {
      return;
    }

    setRestoreFeedback(null);
    setRestoringVersionId(version.id);

    const result = await restoreTripPlanVersionClient(id, version.id);

    if (!result.ok) {
      setRestoringVersionId(null);
      setRestoreFeedback(buildTripPlanVersionRestoreErrorView(result.error.message));
      return;
    }

    setRestoreFeedback(
      buildTripPlanVersionRestoreSuccessView(result.data.currentVersion),
    );
    setPreviewState({ status: "idle" });
    await loadTripDetail();
    await loadVersions();
    setRestoringVersionId(null);
  }

  const isUnauthorized =
    detailState.status === "error" && detailState.error.kind === "unauthorized";

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        {detailState.status === "loading" ? (
          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm leading-6 text-zinc-600">正在加载行程详情...</p>
          </section>
        ) : null}

        {isUnauthorized ? <LoginGuide id={id} /> : null}

        {detailState.status === "error" && !isUnauthorized ? (
          <ErrorState error={detailState.error} />
        ) : null}

        {detailState.status === "success" ? (
          <>
            <DetailSummary detail={detailState.detail} />
            <TripPlanResult
              tripPlan={detailState.detail.currentVersion.tripPlan}
              showDebugJson={false}
            />
            <VersionHistoryPanel
              detail={detailState.detail}
              versionsState={versionsState}
              previewState={previewState}
              restoreFeedback={restoreFeedback}
              restoringVersionId={restoringVersionId}
              onPreview={handlePreview}
              onRestore={handleRestore}
            />
            {previewState.status === "success" ? (
              <VersionPreview version={previewState.version} />
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
