"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { TripPlanResult } from "@/components/trip/trip-plan-result";
import {
  getSavedTripPlanSourceLabel,
  getSharedTripClient,
  type PublicSharedTrip,
  type TripHistoryClientError,
} from "@/lib/services/trip-history-client";
import {
  buildPublicShareUnavailableDetailMessage,
  buildPublicShareUnavailableMessage,
} from "@/lib/services/trip-share-view";

type SharedTripState =
  | {
      status: "loading";
    }
  | {
      status: "success";
      sharedTrip: PublicSharedTrip;
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

function PublicUnavailableState() {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-zinc-500">共享行程</p>
      <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-zinc-950">
        {buildPublicShareUnavailableMessage()}
      </h1>
      <p className="mt-3 break-words text-sm leading-6 text-zinc-600">
        {buildPublicShareUnavailableDetailMessage()}
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        返回生成页
      </Link>
    </section>
  );
}

function PublicShareBanner({ sharedTrip }: { sharedTrip: PublicSharedTrip }) {
  const { share } = sharedTrip;

  return (
    <section
      className="rounded-md border border-emerald-200 bg-white p-5 shadow-sm"
      data-print-hidden="true"
    >
      <p className="text-sm font-semibold text-emerald-700">公开只读分享</p>
      <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
        {sharedTrip.tripPlan.input.destination} 旅行计划草稿
      </h1>
      <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-zinc-600">
        这是通过分享链接公开查看的固定快照。页面只提供阅读，不提供保存、恢复、编辑、撤销或版本历史操作；实时或易变信息仍需出发前人工确认。
      </p>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md bg-zinc-50 p-3">
          <dt className="font-medium text-zinc-500">分享时间</dt>
          <dd className="mt-1 break-words font-semibold text-zinc-900">
            {formatDateTime(share.sharedAt)}
          </dd>
        </div>
        <div className="rounded-md bg-zinc-50 p-3">
          <dt className="font-medium text-zinc-500">失效时间</dt>
          <dd className="mt-1 break-words font-semibold text-zinc-900">
            {share.expiresAt === null ? "不自动失效" : formatDateTime(share.expiresAt)}
          </dd>
        </div>
        <div className="rounded-md bg-zinc-50 p-3">
          <dt className="font-medium text-zinc-500">快照版本</dt>
          <dd className="mt-1 break-words font-semibold text-zinc-900">
            v{share.version.versionNumber}
          </dd>
        </div>
        <div className="rounded-md bg-zinc-50 p-3">
          <dt className="font-medium text-zinc-500">来源摘要</dt>
          <dd className="mt-1 break-words font-semibold text-zinc-900">
            {getSavedTripPlanSourceLabel(share.version.source)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function SharedTripPageClient({ token }: { token: string }) {
  const [sharedTripState, setSharedTripState] = useState<SharedTripState>({
    status: "loading",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadSharedTrip() {
      setSharedTripState({ status: "loading" });

      const result = await getSharedTripClient(token);

      if (!isMounted) {
        return;
      }

      if (result.ok) {
        setSharedTripState({
          status: "success",
          sharedTrip: result.data,
        });
        return;
      }

      setSharedTripState({
        status: "error",
        error: result.error,
      });
    }

    void loadSharedTrip();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <main className="bg-[#f7f5f0] text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        {sharedTripState.status === "loading" ? (
          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm leading-6 text-zinc-600">正在加载共享行程...</p>
          </section>
        ) : null}

        {sharedTripState.status === "error" ? (
          <PublicUnavailableState />
        ) : null}

        {sharedTripState.status === "success" ? (
          <>
            <PublicShareBanner sharedTrip={sharedTripState.sharedTrip} />
            <TripPlanResult
              tripPlan={sharedTripState.sharedTrip.tripPlan}
              showDebugJson={false}
              showResultActions={false}
              showSaveAction={false}
            />
          </>
        ) : null}
      </div>
    </main>
  );
}
