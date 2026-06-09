"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { TripPlanResult } from "@/components/trip/trip-plan-result";
import {
  getSavedTripPlanDetail,
  getSavedTripPlanSourceLabel,
  type SavedTripPlanDetail,
  type TripHistoryClientError,
} from "@/lib/services/trip-history-client";

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

export function TripDetailPageClient({ id }: { id: string }) {
  const [state, setState] = useState<TripDetailState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function loadTripDetail() {
      const result = await getSavedTripPlanDetail(id);

      if (!isMounted) {
        return;
      }

      if (result.ok) {
        setState({
          status: "success",
          detail: result.data,
        });
        return;
      }

      setState({
        status: "error",
        error: result.error,
      });
    }

    void loadTripDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const isUnauthorized = state.status === "error" && state.error.kind === "unauthorized";

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        {state.status === "loading" ? (
          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm leading-6 text-zinc-600">正在加载行程详情...</p>
          </section>
        ) : null}

        {isUnauthorized ? <LoginGuide id={id} /> : null}

        {state.status === "error" && !isUnauthorized ? <ErrorState error={state.error} /> : null}

        {state.status === "success" ? (
          <>
            <DetailSummary detail={state.detail} />
            <TripPlanResult
              tripPlan={state.detail.currentVersion.tripPlan}
              showDebugJson={false}
            />
          </>
        ) : null}
      </div>
    </main>
  );
}
