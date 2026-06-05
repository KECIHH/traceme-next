"use client";

import { useMemo, useState } from "react";

type DestinationSuggestion = {
  name: string;
  tags: string[];
  shortReason: string;
};

type DestinationSuggestionsProps = {
  disabled?: boolean;
  onSelectDestination: (destination: string) => void;
};

const suggestions: DestinationSuggestion[] = [
  {
    name: "成都",
    tags: ["美食", "城市文化", "慢节奏"],
    shortReason: "适合把小吃、茶馆和市区散步放进同一趟行程。",
  },
  {
    name: "厦门",
    tags: ["海边", "散步", "轻松"],
    shortReason: "适合安排海岸线、老街区和岛屿氛围体验。",
  },
  {
    name: "西安",
    tags: ["历史", "博物馆", "面食"],
    shortReason: "适合把历史遗迹、博物馆和本地风味串成几天行程。",
  },
  {
    name: "桂林",
    tags: ["山水", "自然", "摄影"],
    shortReason: "适合偏自然景观和较松弛的城市周边旅行。",
  },
  {
    name: "杭州",
    tags: ["湖景", "文化", "短途"],
    shortReason: "适合安排西湖周边、人文街区和茶文化体验。",
  },
  {
    name: "青岛",
    tags: ["海滨", "建筑", "啤酒"],
    shortReason: "适合海边步行、城市建筑和轻量餐饮体验。",
  },
  {
    name: "大理",
    tags: ["湖山", "慢行", "小镇"],
    shortReason: "适合留出更多自由时间，围绕洱海和古城慢慢走。",
  },
  {
    name: "重庆",
    tags: ["山城", "夜景", "火锅"],
    shortReason: "适合城市探索、立体交通体验和夜间风景安排。",
  },
  {
    name: "苏州",
    tags: ["园林", "古城", "周末"],
    shortReason: "适合短途文化旅行，把园林、街巷和评弹茶馆组合起来。",
  },
  {
    name: "泉州",
    tags: ["古城", "海丝", "小吃"],
    shortReason: "适合关注城市历史、街区步行和本地饮食的行程。",
  },
  {
    name: "昆明",
    tags: ["四季", "城市周边", "轻松"],
    shortReason: "适合作为云南轻量旅行起点，安排城市与近郊体验。",
  },
  {
    name: "南京",
    tags: ["历史", "博物馆", "梧桐路"],
    shortReason: "适合把历史场馆、城市道路和本地餐饮放进同一计划。",
  },
];

function shuffleSuggestions(seed: number) {
  return [...suggestions]
    .map((suggestion, index) => ({
      suggestion,
      sortKey: Math.sin(seed + index * 17.17),
    }))
    .sort((left, right) => left.sortKey - right.sortKey)
    .map(({ suggestion }) => suggestion);
}

export function DestinationSuggestions({
  disabled,
  onSelectDestination,
}: DestinationSuggestionsProps) {
  const [seed, setSeed] = useState<number | null>(null);
  const currentSuggestions = useMemo(() => {
    if (seed === null) {
      return suggestions.slice(0, 4);
    }

    return shuffleSuggestions(seed).slice(0, 4);
  }, [seed]);

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">目的地灵感</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            本地静态推荐，仅用于启发目的地选择，不代表实时热度、价格或可订情况。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSeed(Date.now() + Math.random())}
          disabled={disabled}
          className="h-9 shrink-0 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          换一批
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {currentSuggestions.map((suggestion) => (
          <button
            key={suggestion.name}
            type="button"
            onClick={() => onSelectDestination(suggestion.name)}
            disabled={disabled}
            className="min-h-32 rounded-md border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="block text-base font-semibold text-zinc-950">{suggestion.name}</span>
            <span className="mt-2 block text-sm leading-6 text-zinc-600">
              {suggestion.shortReason}
            </span>
            <span className="mt-3 flex flex-wrap gap-2">
              {suggestion.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"
                >
                  {tag}
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
