"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getSavedTripPlanSourceLabel,
  listDeletedTripPlansClient,
  restoreDeletedTripPlanClient,
  type DeletedTripPlanSummary,
  type TripHistoryClientError,
} from "@/lib/services/trip-history-client";

type DeletedTripsPageState =
  | {
      status: "loading";
    }
  | {
      status: "success";
      records: DeletedTripPlanSummary[];
    }
  | {
      status: "error";
      error: TripHistoryClientError;
    };

type RestoreFeedback =
  | {
      tone: "success";
      message: string;
      restoredId: string;
    }
  | {
      tone: "error";
      message: string;
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

function LoginGuide() {
  return (
    <section className="rounded-md border border-emerald-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-emerald-700">需要登录</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
        登录后查看最近删除
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        这里只显示当前登录账号在恢复窗口内可以查看的已删除行程摘要。
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={`/api/auth/signin?callbackUrl=${encodeURIComponent("/trips/deleted")}`}
          className="inline-flex rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          登录
        </a>
        <Link
          href="/trips"
          className="inline-flex rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          返回我的行程
        </Link>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-md border border-dashed border-zinc-300 bg-white/75 p-6 text-center">
      <h2 className="text-xl font-semibold text-zinc-950">暂无最近删除的行程</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        删除后的行程会暂时显示在这里，并可在 30 天内恢复；恢复后旧分享链接不会自动恢复。
      </p>
      <Link
        href="/trips"
        className="mt-5 inline-flex rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        返回我的行程
      </Link>
    </section>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: TripHistoryClientError;
  onRetry(): void;
}) {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 p-5">
      <p className="text-sm font-semibold text-red-900">无法加载最近删除</p>
      <p className="mt-2 text-sm leading-6 text-red-800">{error.message}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          重试加载
        </button>
        <Link
          href="/trips"
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-900 ring-1 ring-red-200 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          返回我的行程
        </Link>
      </div>
    </section>
  );
}

function DeletedTripRecordCard({
  record,
  isRestoring,
  onRestore,
}: {
  record: DeletedTripPlanSummary;
  isRestoring: boolean;
  onRestore(record: DeletedTripPlanSummary): void;
}) {
  return (
    <article className="min-w-0 rounded-md border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-200">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {getSavedTripPlanSourceLabel(record.source)}
          </p>
          <h2 className="mt-2 break-words text-xl font-semibold tracking-tight text-zinc-950">
            {record.title}
          </h2>
          <p className="mt-2 break-words text-sm leading-6 text-zinc-600">
            {record.departureCity} → {record.destination}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRestore(record)}
          disabled={isRestoring}
          className="shrink-0 rounded-md bg-emerald-700 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isRestoring ? "正在恢复..." : "恢复"}
        </button>
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
          <dt className="font-medium text-zinc-500">删除时间</dt>
          <dd className="mt-1 break-words font-semibold text-zinc-900">
            {formatDateTime(record.deletedAt)}
          </dd>
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
      </dl>
    </article>
  );
}

export function DeletedTripsPageClient() {
  const [state, setState] = useState<DeletedTripsPageState>({ status: "loading" });
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreFeedback, setRestoreFeedback] = useState<RestoreFeedback | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDeletedTrips() {
      const result = await listDeletedTripPlansClient();

      if (!isMounted) {
        return;
      }

      if (result.ok) {
        setState({
          status: "success",
          records: result.data.records,
        });
        return;
      }

      setState({
        status: "error",
        error: result.error,
      });
    }

    void loadDeletedTrips();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleRetryLoad() {
    setState({ status: "loading" });

    const result = await listDeletedTripPlansClient();

    if (result.ok) {
      setState({
        status: "success",
        records: result.data.records,
      });
      return;
    }

    setState({
      status: "error",
      error: result.error,
    });
  }

  async function handleRestore(record: DeletedTripPlanSummary) {
    const confirmed = window.confirm(
      `确认恢复“${record.title}”吗？恢复后会重新回到我的行程，旧分享链接不会自动恢复，需要在详情页重新创建分享链接。`,
    );

    if (!confirmed) {
      return;
    }

    setRestoringId(record.id);
    setRestoreFeedback(null);

    const result = await restoreDeletedTripPlanClient(record.id);

    if (!result.ok) {
      setRestoringId(null);
      setRestoreFeedback({
        tone: "error",
        message: result.error.message,
      });
      return;
    }

    setState((currentState) => {
      if (currentState.status !== "success") {
        return currentState;
      }

      return {
        status: "success",
        records: currentState.records.filter((item) => item.id !== record.id),
      };
    });
    setRestoringId(null);
    setRestoreFeedback({
      tone: "success",
      message:
        "行程已恢复到我的行程。旧分享链接不会自动恢复，需要在详情页重新创建分享链接。",
      restoredId: record.id,
    });
  }

  const isUnauthorized = state.status === "error" && state.error.kind === "unauthorized";

  return (
    <main className="bg-[#f7f5f0] text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700">已删除行程</p>
            <h1 className="mt-2 break-words text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              最近删除
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
              这里仅显示当前账号自己的已删除行程摘要，可在 30 天内恢复；恢复后旧分享链接不会自动恢复。
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Link
              href="/trips"
              className="rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              我的行程
            </Link>
            <Link
              href="/"
              className="rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              返回生成页
            </Link>
          </div>
        </header>

        {restoreFeedback ? (
          <section
            aria-live="polite"
            className={`rounded-md p-4 text-sm leading-6 ${
              restoreFeedback.tone === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <p className="font-semibold">{restoreFeedback.message}</p>
            {restoreFeedback.tone === "success" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/trips/${restoreFeedback.restoredId}`}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  查看详情
                </Link>
                <Link
                  href="/trips"
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  我的行程
                </Link>
              </div>
            ) : null}
          </section>
        ) : null}

        {state.status === "loading" ? (
          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm leading-6 text-zinc-600">正在加载最近删除...</p>
          </section>
        ) : null}

        {isUnauthorized ? <LoginGuide /> : null}

        {state.status === "error" && !isUnauthorized ? (
          <ErrorState error={state.error} onRetry={() => void handleRetryLoad()} />
        ) : null}

        {state.status === "success" && state.records.length === 0 ? <EmptyState /> : null}

        {state.status === "success" && state.records.length > 0 ? (
          <section className="space-y-4" aria-label="最近删除行程列表">
            {state.records.map((record) => (
              <DeletedTripRecordCard
                key={record.id}
                record={record}
                isRestoring={restoringId === record.id}
                onRestore={handleRestore}
              />
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
