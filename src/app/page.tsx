"use client";

import { useState } from "react";

import { DestinationSuggestions } from "@/components/trip/destination-suggestions";
import { TripPlanResult } from "@/components/trip/trip-plan-result";
import { TripPlannerForm } from "@/components/trip/trip-planner-form";
import { TravelPlanComparisonPanel } from "@/components/trip/travel-plan-comparison-panel";
import type { GenerateTripPlanRequest, TravelPlanComparison, TripPlan } from "@/lib/schemas/trip";
import { generateTravelPlanComparisonFromApi } from "@/lib/services/travel-plan-comparison-client";
import { generateTripPlanFromApi } from "@/lib/services/travel-plan-client";

type GenerateStatus = "idle" | "loading" | "success" | "error";
type ComparisonStatus = "idle" | "loading" | "success" | "error";

function getStatusTitle(status: GenerateStatus) {
  switch (status) {
    case "idle":
      return "准备生成";
    case "loading":
      return "生成中";
    case "success":
      return "已生成草稿";
    case "error":
      return "生成失败";
  }
}

export default function Home() {
  const [destination, setDestination] = useState("成都");
  const [status, setStatus] = useState<GenerateStatus>("idle");
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [comparison, setComparison] = useState<TravelPlanComparison | null>(null);
  const [comparisonStatus, setComparisonStatus] = useState<ComparisonStatus>("idle");
  const [comparisonErrorMessage, setComparisonErrorMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [latestRequest, setLatestRequest] = useState<GenerateTripPlanRequest | null>(null);

  const isLoading = status === "loading";
  const isComparisonLoading = comparisonStatus === "loading";

  async function submitRequest(request: GenerateTripPlanRequest) {
    setStatus("loading");
    setErrorMessage("");
    setComparison(null);
    setComparisonStatus("idle");
    setComparisonErrorMessage("");
    setLatestRequest(request);

    const result = await generateTripPlanFromApi(request);

    if (result.ok) {
      setTripPlan(result.data);
      setStatus("success");
      return;
    }

    setStatus("error");
    setErrorMessage(result.errorMessage);
  }

  async function generateComparison() {
    if (!tripPlan || isLoading || isComparisonLoading) {
      return;
    }

    setComparisonStatus("loading");
    setComparisonErrorMessage("");

    const result = await generateTravelPlanComparisonFromApi(tripPlan);

    if (result.ok) {
      setComparison(result.data);
      setComparisonStatus("success");
      return;
    }

    setComparisonStatus("error");
    setComparisonErrorMessage(result.errorMessage);
  }

  async function regenerateLatestRequest() {
    if (!latestRequest || isLoading) {
      return;
    }

    await submitRequest(latestRequest);
  }

  return (
    <main className="bg-[#f7f5f0] text-zinc-950">
      <div
        className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10"
        data-print-shell="true"
      >
        <header className="max-w-3xl" data-print-hidden="true">
          <p className="text-sm font-semibold text-emerald-700">生成旅行计划</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
            生成旅行计划草稿
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-600">
            输入出发地、目的地、日期、人数和偏好，先生成一份可人工确认的草稿预览。
            保存是手动动作；当前结果会留在本页，不会自动写入我的行程。
          </p>
        </header>

        <div
          className="grid gap-6 lg:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)] lg:items-start"
          data-print-layout="true"
        >
          <div className="space-y-6" data-print-hidden="true">
            <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <TripPlannerForm
                destination={destination}
                isSubmitting={isLoading}
                onDestinationChange={setDestination}
                onSubmit={submitRequest}
              />
            </section>

            <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <DestinationSuggestions
                disabled={isLoading}
                onSelectDestination={setDestination}
              />
            </section>
          </div>

          <aside className="min-w-0 space-y-6">
            <section
              className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm"
              data-print-hidden="true"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-500">生成状态</p>
                  <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                    {getStatusTitle(status)}
                  </h2>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    status === "success"
                      ? "bg-emerald-50 text-emerald-700"
                      : status === "error"
                        ? "bg-red-50 text-red-700"
                        : status === "loading"
                          ? "bg-sky-50 text-sky-700"
                          : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {status}
                </span>
              </div>

              {status === "idle" ? (
                <p className="mt-4 text-sm leading-6 text-zinc-600">
                  填写左侧表单后点击生成。推荐目的地会自动回填到目的地输入框。
                </p>
              ) : null}

              {status === "loading" ? (
                <p className="mt-4 text-sm leading-6 text-sky-800">
                  正在生成旅行计划草稿，请稍等。
                </p>
              ) : null}

              {status === "error" ? (
                <div className="mt-4 rounded-md bg-red-50 p-4 text-sm leading-6 text-red-800">
                  {errorMessage || "生成失败，请稍后再试。"}
                </div>
              ) : null}

              {latestRequest ? (
                <div className="mt-4 flex min-w-0 flex-col gap-3 rounded-md bg-zinc-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="min-w-0 break-words text-xs leading-5 text-zinc-600">
                    最近请求：{latestRequest.departureCity} 到 {latestRequest.destination}，
                    {latestRequest.startDate} 至 {latestRequest.endDate}
                  </p>
                  <button
                    type="button"
                    onClick={regenerateLatestRequest}
                    disabled={isLoading}
                    className="shrink-0 rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400"
                  >
                    重新生成 / 再来一版
                  </button>
                </div>
              ) : null}
            </section>

            {tripPlan && status === "success" ? (
              <>
                <TravelPlanComparisonPanel
                  comparison={comparison}
                  status={comparisonStatus}
                  errorMessage={comparisonErrorMessage}
                  disabled={isLoading}
                  onGenerate={generateComparison}
                />
                <TripPlanResult tripPlan={tripPlan} showSaveAction />
              </>
            ) : (
              <section
                className="rounded-md border border-dashed border-zinc-300 bg-white/70 p-5"
                data-print-hidden="true"
              >
                <h2 className="text-lg font-semibold text-zinc-950">结果预览</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  成功生成后，这里会优先展示完整 TripPlanResult，覆盖每日行程、景点、餐饮、住宿、交通、预算、准备清单、风险提醒、自行确认事项和免责声明。
                  生成计划后，你可以查看完整行程，并复制全文、下载 Markdown 或使用浏览器打印/保存 PDF。
                </p>
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
