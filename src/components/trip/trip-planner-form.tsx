"use client";

import { FormEvent, useMemo, useState } from "react";

import type { GenerateTripPlanRequest, Pace } from "@/lib/schemas/trip";
import { calculateTripDays, isIsoDateOnly } from "@/lib/utils/date";

type BudgetScope = "total" | "perPerson";

type TripPlannerFormProps = {
  destination: string;
  isSubmitting: boolean;
  onDestinationChange: (destination: string) => void;
  onSubmit: (request: GenerateTripPlanRequest) => void | Promise<void>;
};

type FormErrors = Partial<
  Record<
    | "departureCity"
    | "destination"
    | "startDate"
    | "endDate"
    | "travelers"
    | "budgetAmount"
    | "preferences"
    | "customPreference",
    string
  >
>;

const preferenceOptions = [
  "美食",
  "文化",
  "自然",
  "亲子",
  "轻松",
  "摄影",
  "博物馆",
  "小众街区",
];

const paceOptions: Array<{ value: Pace; label: string; description: string }> = [
  { value: "relaxed", label: "舒缓", description: "少赶路，留足休息" },
  { value: "balanced", label: "适中", description: "体验和休息平衡" },
  { value: "intensive", label: "紧凑", description: "尽量多看多走" },
];

const budgetScopeOptions: Array<{ value: BudgetScope; label: string }> = [
  { value: "total", label: "总预算" },
  { value: "perPerson", label: "人均预算" },
];

function buildCustomPreference(scope: BudgetScope, customPreference: string) {
  const scopeLabel =
    budgetScopeOptions.find((option) => option.value === scope)?.label ?? "总预算";
  const trimmedCustomPreference = customPreference.trim();

  if (!trimmedCustomPreference) {
    return `预算口径：${scopeLabel}`;
  }

  return `预算口径：${scopeLabel}；补充偏好：${trimmedCustomPreference}`;
}

export function TripPlannerForm({
  destination,
  isSubmitting,
  onDestinationChange,
  onSubmit,
}: TripPlannerFormProps) {
  const [departureCity, setDepartureCity] = useState("上海");
  const [startDate, setStartDate] = useState("2026-07-01");
  const [endDate, setEndDate] = useState("2026-07-05");
  const [travelers, setTravelers] = useState("2");
  const [budgetAmount, setBudgetAmount] = useState("8000");
  const [budgetScope, setBudgetScope] = useState<BudgetScope>("total");
  const [preferences, setPreferences] = useState<string[]>(["美食", "文化", "轻松"]);
  const [customPreference, setCustomPreference] = useState(
    "希望每天不要太赶，留出休息和临时调整时间。",
  );
  const [pace, setPace] = useState<Pace>("balanced");
  const [errors, setErrors] = useState<FormErrors>({});

  const selectedPace = useMemo(
    () => paceOptions.find((option) => option.value === pace),
    [pace],
  );

  function togglePreference(preference: string) {
    setPreferences((currentPreferences) => {
      if (currentPreferences.includes(preference)) {
        return currentPreferences.filter((item) => item !== preference);
      }

      return [...currentPreferences, preference];
    });
  }

  function validateForm() {
    const nextErrors: FormErrors = {};
    const trimmedDepartureCity = departureCity.trim();
    const trimmedDestination = destination.trim();
    const parsedTravelers = Number(travelers);
    const parsedBudgetAmount = Number(budgetAmount);
    const combinedCustomPreference = buildCustomPreference(budgetScope, customPreference);

    if (!trimmedDepartureCity) {
      nextErrors.departureCity = "请填写出发城市。";
    }

    if (!trimmedDestination) {
      nextErrors.destination = "请填写目的地，或从下方推荐中选择。";
    }

    if (!startDate || !isIsoDateOnly(startDate)) {
      nextErrors.startDate = "请选择有效的出发日期。";
    }

    if (!endDate || !isIsoDateOnly(endDate)) {
      nextErrors.endDate = "请选择有效的返程日期。";
    }

    const tripDays = calculateTripDays(startDate, endDate);

    if (isIsoDateOnly(startDate) && isIsoDateOnly(endDate)) {
      if (tripDays === null) {
        nextErrors.endDate = "返程日期不能早于出发日期。";
      } else if (tripDays > 60) {
        nextErrors.endDate = "当前 MVP 支持最长 60 天旅行。";
      }
    }

    if (!Number.isInteger(parsedTravelers) || parsedTravelers <= 0) {
      nextErrors.travelers = "出行人数必须是有效正整数。";
    } else if (parsedTravelers > 20) {
      nextErrors.travelers = "当前 MVP 支持最多 20 人。";
    }

    if (!Number.isFinite(parsedBudgetAmount) || parsedBudgetAmount <= 0) {
      nextErrors.budgetAmount = "预算金额必须是有效正数。";
    } else if (parsedBudgetAmount > 1_000_000) {
      nextErrors.budgetAmount = "当前 MVP 支持最高 1,000,000 CNY 预算。";
    }

    if (preferences.length === 0) {
      nextErrors.preferences = "请至少选择一个旅行偏好。";
    }

    if (combinedCustomPreference.length > 500) {
      nextErrors.customPreference = "补充偏好过长，请控制在 500 字以内。";
    }

    return {
      errors: nextErrors,
      request:
        Object.keys(nextErrors).length === 0
          ? ({
              departureCity: trimmedDepartureCity,
              destination: trimmedDestination,
              startDate,
              endDate,
              travelers: parsedTravelers,
              budget: {
                amount: parsedBudgetAmount,
                currency: "CNY",
              },
              preferences,
              customPreference: combinedCustomPreference,
              pace,
              generationMode: "quick",
            } satisfies GenerateTripPlanRequest)
          : null,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateForm();
    setErrors(validation.errors);

    if (!validation.request) {
      return;
    }

    await onSubmit(validation.request);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <div>
        <h2 className="text-xl font-semibold text-zinc-950">旅行信息</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          填好基础信息后，会先用当前 mock API 生成一份旅行计划草稿预览。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-800" htmlFor="departureCity">
            出发城市
          </label>
          <input
            id="departureCity"
            value={departureCity}
            onChange={(event) => setDepartureCity(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            placeholder="例如：上海"
            disabled={isSubmitting}
          />
          {errors.departureCity ? (
            <p className="mt-2 text-sm text-red-600">{errors.departureCity}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800" htmlFor="destination">
            目的地
          </label>
          <input
            id="destination"
            value={destination}
            onChange={(event) => onDestinationChange(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            placeholder="例如：成都"
            disabled={isSubmitting}
          />
          {errors.destination ? (
            <p className="mt-2 text-sm text-red-600">{errors.destination}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-800" htmlFor="startDate">
            出发日期
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            disabled={isSubmitting}
          />
          {errors.startDate ? (
            <p className="mt-2 text-sm text-red-600">{errors.startDate}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800" htmlFor="endDate">
            返程日期
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            disabled={isSubmitting}
          />
          {errors.endDate ? (
            <p className="mt-2 text-sm text-red-600">{errors.endDate}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr]">
        <div>
          <label className="block text-sm font-medium text-zinc-800" htmlFor="travelers">
            出行人数
          </label>
          <input
            id="travelers"
            type="number"
            min={1}
            max={20}
            step={1}
            value={travelers}
            onChange={(event) => setTravelers(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            disabled={isSubmitting}
          />
          {errors.travelers ? (
            <p className="mt-2 text-sm text-red-600">{errors.travelers}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800" htmlFor="budgetAmount">
            预算
          </label>
          <div className="mt-2 grid grid-cols-[1fr_auto_auto] overflow-hidden rounded-md border border-zinc-300 bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
            <input
              id="budgetAmount"
              type="number"
              min={1}
              step={100}
              value={budgetAmount}
              onChange={(event) => setBudgetAmount(event.target.value)}
              className="h-11 min-w-0 border-0 px-3 text-sm text-zinc-950 outline-none"
              disabled={isSubmitting}
            />
            <select
              aria-label="预算币种"
              value="CNY"
              className="h-11 border-l border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none"
              disabled
            >
              <option value="CNY">CNY</option>
            </select>
            <select
              aria-label="预算口径"
              value={budgetScope}
              onChange={(event) => setBudgetScope(event.target.value as BudgetScope)}
              className="h-11 border-l border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none"
              disabled={isSubmitting}
            >
              {budgetScopeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {errors.budgetAmount ? (
            <p className="mt-2 text-sm text-red-600">{errors.budgetAmount}</p>
          ) : null}
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-zinc-800">旅行偏好</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {preferenceOptions.map((preference) => {
            const isSelected = preferences.includes(preference);

            return (
              <label
                key={preference}
                className={`inline-flex h-10 cursor-pointer items-center rounded-md border px-3 text-sm transition ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                } ${isSubmitting ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => togglePreference(preference)}
                  className="sr-only"
                  disabled={isSubmitting}
                />
                {preference}
              </label>
            );
          })}
        </div>
        {errors.preferences ? (
          <p className="mt-2 text-sm text-red-600">{errors.preferences}</p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-zinc-800">旅行节奏</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {paceOptions.map((option) => {
            const isSelected = pace === option.value;

            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-md border p-3 transition ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                } ${isSubmitting ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="pace"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => setPace(option.value)}
                  className="sr-only"
                  disabled={isSubmitting}
                />
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="mt-1 block text-xs leading-5 text-zinc-500">
                  {option.description}
                </span>
              </label>
            );
          })}
        </div>
        {selectedPace ? (
          <p className="mt-2 text-xs text-zinc-500">当前选择：{selectedPace.label}</p>
        ) : null}
      </fieldset>

      <div>
        <label className="block text-sm font-medium text-zinc-800" htmlFor="customPreference">
          补充偏好
        </label>
        <textarea
          id="customPreference"
          value={customPreference}
          onChange={(event) => setCustomPreference(event.target.value)}
          rows={4}
          maxLength={420}
          className="mt-2 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          placeholder="例如：每天不要太赶，想多留一点咖啡馆和散步时间。"
          disabled={isSubmitting}
        />
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-zinc-500">
          <span>提交时会带上预算口径：{budgetScope === "total" ? "总预算" : "人均预算"}。</span>
          <span>{customPreference.length}/420</span>
        </div>
        {errors.customPreference ? (
          <p className="mt-2 text-sm text-red-600">{errors.customPreference}</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {isSubmitting ? "正在生成..." : "生成旅行计划草稿"}
      </button>
    </form>
  );
}
