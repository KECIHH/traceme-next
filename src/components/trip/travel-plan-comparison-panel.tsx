import type { TravelPlanComparison, TravelPlanVariant } from "@/lib/schemas/trip";

import { SectionCard } from "./section-card";

type ComparisonStatus = "idle" | "loading" | "success" | "error";

type TravelPlanComparisonPanelProps = {
  comparison: TravelPlanComparison | null;
  status: ComparisonStatus;
  errorMessage: string;
  disabled: boolean;
  onGenerate: () => void | Promise<void>;
};

const sourceProviderLabels: Record<TravelPlanComparison["source"]["provider"], string> = {
  mock: "本地 mock",
  "openai-compatible": "OpenAI-compatible",
};

const optimizationSectionLabels: Array<{
  key: keyof Pick<
    TravelPlanComparison["optimization"],
    "budgetRisks" | "scheduleConflicts" | "replacementIdeas" | "manualConfirmations"
  >;
  label: string;
}> = [
  { key: "budgetRisks", label: "预算风险" },
  { key: "scheduleConflicts", label: "易冲突安排" },
  { key: "replacementIdeas", label: "可替换建议" },
  { key: "manualConfirmations", label: "出发前人工确认" },
];

function formatGeneratedAt(value: string) {
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

function ScoreMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-md bg-white p-3 ring-1 ring-zinc-200">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 break-words text-xs font-medium text-zinc-600">{label}</span>
        <span className="shrink-0 text-sm font-semibold text-zinc-950">{value}/5</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-emerald-600"
          style={{ width: `${Math.max(0, Math.min(value, 5)) * 20}%` }}
        />
      </div>
    </div>
  );
}

function VariantCard({ variant }: { variant: TravelPlanVariant }) {
  return (
    <article className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="min-w-0">
        <h3 className="break-words text-base font-semibold text-zinc-950">{variant.name}</h3>
        <p className="mt-2 break-words text-sm leading-6 text-zinc-700">{variant.style}</p>
        <p className="mt-2 break-words text-sm leading-6 text-zinc-600">
          <span className="font-medium text-zinc-800">适合：</span>
          {variant.suitableFor}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <ScoreMeter label="预算友好" value={variant.scores.budgetFriendliness} />
        <ScoreMeter label="节奏舒适" value={variant.scores.paceRelaxation} />
        <ScoreMeter label="景点密度" value={variant.scores.attractionDensity} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold text-zinc-950">优点</h4>
          <ul className="mt-2 space-y-2">
            {variant.advantages.map((item) => (
              <li key={item} className="break-words text-sm leading-6 text-zinc-700">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-950">可能妥协点</h4>
          <ul className="mt-2 space-y-2">
            {variant.tradeOffs.map((item) => (
              <li key={item} className="break-words text-sm leading-6 text-zinc-700">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-zinc-950">每日安排摘要</h4>
        <div className="mt-2 space-y-2">
          {variant.dailySummary.map((day) => (
            <div key={`${day.day}-${day.date ?? day.title}`} className="rounded-md bg-white p-3">
              <p className="text-xs font-medium text-zinc-500">
                Day {day.day}
                {day.date ? ` · ${day.date}` : ""}
              </p>
              <p className="mt-1 break-words text-sm font-semibold text-zinc-950">
                {day.title}
              </p>
              <p className="mt-1 break-words text-sm leading-6 text-zinc-700">
                {day.summary}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function TravelPlanComparisonPanel({
  comparison,
  status,
  errorMessage,
  disabled,
  onGenerate,
}: TravelPlanComparisonPanelProps) {
  const isLoading = status === "loading";
  const sourceLabel = comparison
    ? (sourceProviderLabels[comparison.source.provider] ?? comparison.source.provider)
    : "";

  return (
    <SectionCard
      title="方案对比与优化建议"
      description="仅基于当前页面的旅行计划草稿生成，不包含实时、准确或官方数据。"
      action={
        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled || isLoading}
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isLoading ? "生成中..." : comparison ? "重新生成对比方案" : "生成对比方案"}
        </button>
      }
    >
      {status === "error" ? (
        <div className="rounded-md bg-red-50 p-4 text-sm leading-6 text-red-800">
          {errorMessage || "对比方案生成失败，请稍后再试。"}
        </div>
      ) : null}

      {status === "idle" && !comparison ? (
        <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
          当前主方案可生成 2-3 个轻量变体，并给出节奏、预算和冲突风险建议。
        </div>
      ) : null}

      {comparison ? (
        <div className="space-y-4">
          <p className="text-xs leading-5 text-zinc-500">
            生成时间：{formatGeneratedAt(comparison.generatedAt)} · 来源：{sourceLabel}
          </p>

          <div className="grid gap-4 xl:grid-cols-3">
            {comparison.variants.map((variant) => (
              <VariantCard key={variant.name} variant={variant} />
            ))}
          </div>

          <article className="min-w-0 rounded-md border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-base font-semibold text-zinc-950">优化建议</h3>
            <p className="mt-2 break-words text-sm leading-6 text-amber-950">
              {comparison.optimization.paceTightness}
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {optimizationSectionLabels.map(({ key, label }) => (
                <div key={key} className="rounded-md bg-white p-4 ring-1 ring-amber-200">
                  <h4 className="text-sm font-semibold text-zinc-950">{label}</h4>
                  <ul className="mt-2 space-y-2">
                    {comparison.optimization[key].map((item) => (
                      <li key={item} className="break-words text-sm leading-6 text-zinc-700">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>

          <p className="break-words rounded-md bg-zinc-50 p-3 text-sm leading-6 text-zinc-600">
            {comparison.disclaimer}
          </p>
        </div>
      ) : null}
    </SectionCard>
  );
}
