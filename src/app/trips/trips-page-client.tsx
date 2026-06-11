"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  deleteTripPlanClient,
  getSavedTripPlanSourceLabel,
  listSavedTripPlans,
  type SavedTripPlanSummary,
  type TripHistoryClientError,
} from "@/lib/services/trip-history-client";

type TripsPageState =
  | {
      status: "loading";
    }
  | {
      status: "success";
      records: SavedTripPlanSummary[];
    }
  | {
      status: "error";
      error: TripHistoryClientError;
    };

type DeleteFeedback =
  | {
      tone: "success";
      message: string;
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
        登录后查看我的行程
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        这里只显示当前登录账号已经保存的行程。未登录时不会加载或展示任何历史数据。
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={`/api/auth/signin?callbackUrl=${encodeURIComponent("/trips")}`}
          className="inline-flex rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          登录
        </a>
        <Link
          href="/"
          className="inline-flex rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          返回生成页
        </Link>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-md border border-dashed border-zinc-300 bg-white/75 p-6 text-center">
      <h2 className="text-xl font-semibold text-zinc-950">当前还没有保存的行程</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        生成页面不会自动保存行程；只有手动保存成功的记录才会出现在这里。
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          href="/"
          className="inline-flex rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          去生成计划
        </Link>
        <Link
          href="/trips/deleted"
          className="inline-flex rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          最近删除
        </Link>
      </div>
    </section>
  );
}

function ErrorState({ error }: { error: TripHistoryClientError }) {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 p-5">
      <p className="text-sm font-semibold text-red-900">无法加载我的行程</p>
      <p className="mt-2 text-sm leading-6 text-red-800">{error.message}</p>
    </section>
  );
}

function TripRecordCard({
  record,
  isDeleting,
  onDelete,
}: {
  record: SavedTripPlanSummary;
  isDeleting: boolean;
  onDelete(record: SavedTripPlanSummary): void;
}) {
  return (
    <article className="min-w-0 rounded-md border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-200">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {getSavedTripPlanSourceLabel(record.source)}
          </p>
          <h2 className="mt-2 break-words text-xl font-semibold tracking-tight text-zinc-950">
            <Link href={`/trips/${record.id}`} className="hover:text-emerald-700">
              {record.title}
            </Link>
          </h2>
          <p className="mt-2 break-words text-sm leading-6 text-zinc-600">
            {record.departureCity} → {record.destination}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Link
            href={`/trips/${record.id}`}
            className="rounded-md bg-zinc-950 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            查看详情
          </Link>
          <button
            type="button"
            onClick={() => onDelete(record)}
            disabled={isDeleting}
            className="rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 disabled:ring-zinc-200"
          >
            {isDeleting ? "正在删除..." : "删除"}
          </button>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
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
      </dl>
    </article>
  );
}

export function TripsPageClient() {
  const [state, setState] = useState<TripsPageState>({ status: "loading" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<DeleteFeedback | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTrips() {
      const result = await listSavedTripPlans();

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

    void loadTrips();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleDelete(record: SavedTripPlanSummary) {
    const confirmed = window.confirm(
      `确认删除“${record.title}”吗？这是软删除：会移出我的行程并让原分享链接不可用，可在 30 天内到最近删除恢复；恢复后需要重新创建分享链接。`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(record.id);
    setDeleteFeedback(null);

    const result = await deleteTripPlanClient(record.id);

    if (!result.ok) {
      setDeletingId(null);
      setDeleteFeedback({
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
    setDeletingId(null);
    setDeleteFeedback({
      tone: "success",
      message:
        "已移入最近删除，可在 30 天内恢复。旧分享链接已不可用，恢复后需要重新创建分享链接。",
    });
  }

  const isUnauthorized = state.status === "error" && state.error.kind === "unauthorized";

  return (
    <main className="bg-[#f7f5f0] text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700">已保存行程</p>
            <h1 className="mt-2 break-words text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              我的行程
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
              这里显示当前账号已保存的行程，可查看详情，也可以将不再需要的行程软删除到最近删除；旧分享链接会随删除失效。
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Link
              href="/trips/deleted"
              className="rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              最近删除
            </Link>
            <Link
              href="/"
              className="rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              返回生成页
            </Link>
          </div>
        </header>

        {deleteFeedback ? (
          <section
            aria-live="polite"
            className={`rounded-md p-4 text-sm leading-6 ${
              deleteFeedback.tone === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <p className="font-semibold">{deleteFeedback.message}</p>
            {deleteFeedback.tone === "success" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/trips/deleted"
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  查看最近删除
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
            <p className="text-sm leading-6 text-zinc-600">正在加载我的行程...</p>
          </section>
        ) : null}

        {isUnauthorized ? <LoginGuide /> : null}

        {state.status === "error" && !isUnauthorized ? <ErrorState error={state.error} /> : null}

        {state.status === "success" && state.records.length === 0 ? <EmptyState /> : null}

        {state.status === "success" && state.records.length > 0 ? (
          <section className="space-y-4" aria-label="已保存行程列表">
            {state.records.map((record) => (
              <TripRecordCard
                key={record.id}
                record={record}
                isDeleting={deletingId === record.id}
                onDelete={handleDelete}
              />
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
