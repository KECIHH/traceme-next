import type {
  AccommodationSuggestion,
  Attraction,
  BudgetBreakdownItem,
  FoodSuggestion,
  PackingChecklistItem,
  Pace,
  RiskReminder,
  Transportation,
  TripPlan,
  UserVerifyItem,
} from "@/lib/schemas/trip";
import { getBudgetSummary } from "@/lib/utils/budget";

import { DayItineraryCard } from "./day-itinerary-card";
import { ResultActions } from "./result-actions";
import { SectionCard } from "./section-card";
import { VerifyBadge } from "./verify-badge";

type TripPlanResultProps = {
  tripPlan: TripPlan;
};

const paceLabels: Record<Pace, string> = {
  relaxed: "舒缓",
  balanced: "适中",
  intensive: "紧凑",
};

const generationModeLabels: Record<TripPlan["generationMode"], string> = {
  quick: "快速生成",
};

const sourceProviderLabels: Record<TripPlan["source"]["provider"], string> = {
  mock: "本地 mock",
  "openai-compatible": "OpenAI-compatible",
};

const priceLevelLabels: Record<FoodSuggestion["priceLevel"], string> = {
  budget: "经济",
  midRange: "适中",
  premium: "偏高",
  unknown: "未估算",
};

const budgetCategoryLabels: Record<BudgetBreakdownItem["category"], string> = {
  transportation: "交通",
  accommodation: "住宿",
  food: "餐饮",
  attractions: "景点",
  shopping: "购物",
  other: "其他",
};

const packingCategoryLabels: Record<PackingChecklistItem["category"], string> = {
  documents: "证件与订单",
  clothing: "衣物",
  electronics: "电子设备",
  health: "健康用品",
  other: "其他",
};

const verifyCategoryLabels: Record<UserVerifyItem["category"], string> = {
  ticketReservation: "门票/预约",
  openingHours: "营业时间",
  hotelPrice: "酒店价格",
  transportSchedulePrice: "交通班次/价格",
  weather: "天气",
  other: "其他",
};

function formatCurrency(amount: number, currency: "CNY") {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

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

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 text-zinc-500">
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-zinc-50 p-3">
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-zinc-950">{value}</dd>
    </div>
  );
}

function VerifyNote({ note }: { note?: string }) {
  if (!note) {
    return null;
  }

  return (
    <p className="mt-3 break-words rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-900">
      {note}
    </p>
  );
}

function SuggestedSource({ item }: { item: UserVerifyItem }) {
  const suggestedSource = (item as UserVerifyItem & { suggestedSource?: string }).suggestedSource;

  if (!suggestedSource) {
    return null;
  }

  return (
    <p className="mt-2 break-words text-sm leading-6 text-amber-900">
      <span className="font-medium">建议来源：</span>
      {suggestedSource}
    </p>
  );
}

function AttractionCard({ attraction }: { attraction: Attraction }) {
  return (
    <article className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="min-w-0 break-words text-base font-semibold text-zinc-950">
          {attraction.name}
        </h3>
        <VerifyBadge needVerify={attraction.needVerify} />
      </div>
      <p className="mt-2 break-words text-sm leading-6 text-zinc-700">
        {attraction.reason}
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="font-medium text-zinc-500">建议停留</dt>
          <dd className="mt-1 break-words text-zinc-800">{attraction.suggestedDuration}</dd>
        </div>
        {attraction.ticketInfo ? (
          <div>
            <dt className="font-medium text-zinc-500">门票信息</dt>
            <dd className="mt-1 break-words text-zinc-800">{attraction.ticketInfo}</dd>
          </div>
        ) : null}
        {attraction.openingHours ? (
          <div>
            <dt className="font-medium text-zinc-500">营业时间</dt>
            <dd className="mt-1 break-words text-zinc-800">{attraction.openingHours}</dd>
          </div>
        ) : null}
      </dl>
      <VerifyNote note={attraction.verifyNote} />
    </article>
  );
}

function FoodCard({ suggestion }: { suggestion: FoodSuggestion }) {
  return (
    <article className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="min-w-0 break-words text-base font-semibold text-zinc-950">
          {suggestion.areaOrRestaurant}
        </h3>
        <VerifyBadge needVerify={suggestion.needVerify} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
          {suggestion.cuisine}
        </span>
        <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
          价格参考：{priceLevelLabels[suggestion.priceLevel]}
        </span>
      </div>
      <p className="mt-3 break-words text-sm leading-6 text-zinc-700">{suggestion.reason}</p>
      <VerifyNote note={suggestion.verifyNote} />
    </article>
  );
}

function AccommodationCard({ suggestion }: { suggestion: AccommodationSuggestion }) {
  return (
    <article className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="min-w-0 break-words text-base font-semibold text-zinc-950">
          {suggestion.area}
        </h3>
        <VerifyBadge needVerify={suggestion.needVerify} />
      </div>
      <span className="mt-2 inline-flex rounded-md bg-white px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
        价格参考：{priceLevelLabels[suggestion.priceLevel]}
      </span>
      <p className="mt-3 break-words text-sm leading-6 text-zinc-700">{suggestion.reason}</p>
      <VerifyNote note={suggestion.verifyNote} />
    </article>
  );
}

function TransportationCard({ item }: { item: Transportation }) {
  return (
    <article className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="min-w-0 break-words text-base font-semibold text-zinc-950">
          {item.route}
        </h3>
        <VerifyBadge needVerify={item.needVerify} />
      </div>
      <p className="mt-2 break-words text-sm font-medium text-zinc-600">{item.method}</p>
      <p className="mt-3 break-words text-sm leading-6 text-zinc-700">{item.description}</p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {item.estimatedDuration ? (
          <div className="rounded-md bg-white p-3">
            <dt className="font-medium text-zinc-500">耗时参考</dt>
            <dd className="mt-1 break-words text-zinc-800">{item.estimatedDuration}</dd>
          </div>
        ) : null}
        {item.estimatedPrice ? (
          <div className="rounded-md bg-white p-3">
            <dt className="font-medium text-zinc-500">费用参考</dt>
            <dd className="mt-1 break-words text-zinc-800">{item.estimatedPrice}</dd>
          </div>
        ) : null}
      </dl>
      <VerifyNote note={item.verifyNote} />
    </article>
  );
}

function BudgetItem({ item }: { item: BudgetBreakdownItem }) {
  return (
    <article className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold text-zinc-950">
            {budgetCategoryLabels[item.category]}
          </h3>
          <p className="mt-1 text-sm font-semibold text-zinc-700">
            {formatCurrency(item.amount, item.currency)}
          </p>
        </div>
        <VerifyBadge needVerify={item.needVerify} label="估算参考" />
      </div>
      <p className="mt-3 break-words text-sm leading-6 text-zinc-700">{item.description}</p>
      <VerifyNote note={item.verifyNote} />
    </article>
  );
}

function RiskItem({ item }: { item: RiskReminder }) {
  return (
    <article className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="min-w-0 break-words text-base font-semibold text-zinc-950">
          {item.title}
        </h3>
        <span
          className={`rounded-md px-2 py-1 text-xs font-semibold ${
            item.needVerify
              ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
              : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
          }`}
        >
          {item.needVerify ? "出行前确认" : "一般提醒"}
        </span>
      </div>
      <p className="mt-3 break-words text-sm leading-6 text-zinc-700">{item.description}</p>
      {item.verifyNote ? (
        <p className="mt-3 break-words rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          <span className="font-medium">建议应对：</span>
          {item.verifyNote}
        </p>
      ) : null}
    </article>
  );
}

export function TripPlanResult({ tripPlan }: TripPlanResultProps) {
  const {
    input,
    overview,
    dailyItinerary = [],
    attractions = [],
    foodSuggestions = [],
    accommodationSuggestions = [],
    transportation = [],
    budgetBreakdown = [],
    packingChecklist = [],
    riskReminders = [],
    userVerifyItems = [],
  } = tripPlan;
  const budgetTotal = budgetBreakdown.reduce((total, item) => total + item.amount, 0);
  const budgetSummary = getBudgetSummary(input.budget, input.travelers);
  const title = `${input.destination} ${input.days} 天旅行计划草稿`;
  const sourceLabel = sourceProviderLabels[tripPlan.source.provider] ?? tripPlan.source.provider;
  const sourceKindLabel = tripPlan.source.kind === "mock" ? "mock 草稿" : "AI 草稿";

  return (
    <div className="min-w-0 space-y-6">
      <SectionCard
        title={title}
        eyebrow="完整结果"
        action={<VerifyBadge needVerify label={sourceKindLabel} />}
      >
        <p className="break-words text-sm leading-6 text-zinc-700">{overview}</p>
        <p className="text-xs leading-5 text-zinc-500">
          生成时间：{formatGeneratedAt(tripPlan.generatedAt)} · 来源：{sourceLabel}
        </p>
      </SectionCard>

      <ResultActions tripPlan={tripPlan} />

      <SectionCard title="基本信息" description="本区块来自本次提交的旅行输入。">
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <InfoItem label="出发城市" value={input.departureCity} />
          <InfoItem label="目的地" value={input.destination} />
          <InfoItem label="日期" value={`${input.startDate} 至 ${input.endDate}`} />
          <InfoItem label="天数" value={`${input.days} 天`} />
          <InfoItem label="出行人数" value={`${input.travelers} 人`} />
          <InfoItem
            label={`用户填写${budgetSummary.submittedLabel}`}
            value={formatCurrency(budgetSummary.submittedAmount, input.budget.currency)}
          />
          <InfoItem
            label="总预算参考"
            value={formatCurrency(budgetSummary.totalAmount, input.budget.currency)}
          />
          <InfoItem
            label="人均预算参考"
            value={formatCurrency(budgetSummary.perPersonAmount, input.budget.currency)}
          />
          <InfoItem label="旅行节奏" value={paceLabels[input.pace] ?? input.pace} />
          <InfoItem
            label="生成模式"
            value={generationModeLabels[tripPlan.generationMode] ?? tripPlan.generationMode}
          />
          <InfoItem label="生成来源" value={sourceLabel} />
        </dl>
        <div className="rounded-md bg-zinc-50 p-3">
          <p className="text-xs font-medium text-zinc-500">旅行偏好</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {input.preferences.length > 0 ? (
              input.preferences.map((preference) => (
                <span
                  key={preference}
                  className="rounded-md bg-white px-2 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200"
                >
                  {preference}
                </span>
              ))
            ) : (
              <span className="text-sm text-zinc-500">暂无偏好。</span>
            )}
          </div>
          {input.customPreference ? (
            <p className="mt-3 break-words text-sm leading-6 text-zinc-700">
              {input.customPreference}
            </p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="每日行程" description="当前 schema 使用 items 表示每天的时间段安排。">
        {dailyItinerary.length > 0 ? (
          <div className="space-y-4">
            {dailyItinerary.map((day) => (
              <DayItineraryCard key={`${day.day}-${day.date}`} day={day} />
            ))}
          </div>
        ) : (
          <EmptyState>暂无每日行程。</EmptyState>
        )}
      </SectionCard>

      <SectionCard title="景区安排">
        {attractions.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {attractions.map((attraction) => (
              <AttractionCard key={attraction.name} attraction={attraction} />
            ))}
          </div>
        ) : (
          <EmptyState>暂无景区安排。</EmptyState>
        )}
      </SectionCard>

      <SectionCard title="餐饮建议">
        {foodSuggestions.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {foodSuggestions.map((suggestion) => (
              <FoodCard
                key={`${suggestion.areaOrRestaurant}-${suggestion.cuisine}`}
                suggestion={suggestion}
              />
            ))}
          </div>
        ) : (
          <EmptyState>暂无餐饮建议。</EmptyState>
        )}
      </SectionCard>

      <SectionCard title="住宿建议">
        {accommodationSuggestions.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {accommodationSuggestions.map((suggestion) => (
              <AccommodationCard key={suggestion.area} suggestion={suggestion} />
            ))}
          </div>
        ) : (
          <EmptyState>暂无住宿建议。</EmptyState>
        )}
      </SectionCard>

      <SectionCard title="交通方案">
        {transportation.length > 0 ? (
          <div className="space-y-4">
            {transportation.map((item) => (
              <TransportationCard key={`${item.route}-${item.method}`} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState>暂无交通方案。</EmptyState>
        )}
      </SectionCard>

      <SectionCard
        title="预算拆分"
        description="预算内容为估算参考，不代表实际成交价格。"
        action={<VerifyBadge needVerify label="估算参考" />}
      >
        <dl className="grid gap-3 sm:grid-cols-3">
          <InfoItem
            label="总预算估算"
            value={formatCurrency(budgetSummary.totalAmount, input.budget.currency)}
          />
          <InfoItem
            label="拆分合计"
            value={formatCurrency(budgetTotal, input.budget.currency)}
          />
          <InfoItem
            label="人均参考"
            value={formatCurrency(budgetSummary.perPersonAmount, input.budget.currency)}
          />
        </dl>
        {budgetBreakdown.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {budgetBreakdown.map((item) => (
              <BudgetItem key={`${item.category}-${item.amount}`} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState>暂无预算拆分。</EmptyState>
        )}
        <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4">
          <h3 className="text-sm font-semibold text-zinc-950">省钱建议</h3>
          <p className="mt-2 break-words text-sm leading-6 text-zinc-600">
            暂无单独省钱建议。可优先核对交通与住宿价格，按实际预算调整餐饮、景点和机动支出。
          </p>
        </div>
      </SectionCard>

      <SectionCard title="准备清单">
        {packingChecklist.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {packingChecklist.map((group) => (
              <article key={group.category} className="min-w-0 rounded-md bg-zinc-50 p-4">
                <h3 className="text-sm font-semibold text-zinc-950">
                  {packingCategoryLabels[group.category]}
                </h3>
                {group.items.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {group.items.map((item) => (
                      <li
                        key={item}
                        className="break-words text-sm leading-6 text-zinc-700"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">暂无清单项。</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState>暂无准备清单。</EmptyState>
        )}
      </SectionCard>

      <SectionCard title="风险提醒" description="风险提醒使用温和提示，帮助出发前做确认。">
        {riskReminders.length > 0 ? (
          <div className="space-y-4">
            {riskReminders.map((item) => (
              <RiskItem key={item.title} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState>暂无风险提醒。</EmptyState>
        )}
      </SectionCard>

      <SectionCard
        title="用户自行确认事项"
        description="这些事项需要在出发前通过官方或可信渠道确认。"
        className="border-amber-200 bg-amber-50"
      >
        {userVerifyItems.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {userVerifyItems.map((item) => (
              <article
                key={`${item.category}-${item.item}`}
                className="min-w-0 rounded-md border border-amber-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                    {verifyCategoryLabels[item.category]}
                  </span>
                  <h3 className="min-w-0 break-words text-base font-semibold text-zinc-950">
                    {item.item}
                  </h3>
                </div>
                <p className="mt-3 break-words text-sm leading-6 text-zinc-700">
                  <span className="font-medium">原因：</span>
                  {item.reason}
                </p>
                <p className="mt-2 break-words text-sm leading-6 text-zinc-700">
                  <span className="font-medium">建议操作：</span>
                  {item.suggestedAction}
                </p>
                <SuggestedSource item={item} />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState>暂无用户自行确认事项。</EmptyState>
        )}
      </SectionCard>

      <SectionCard title="免责声明">
        <p className="break-words text-sm leading-6 text-zinc-700">{tripPlan.disclaimer}</p>
      </SectionCard>

      <details className="min-w-0 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-medium text-zinc-800">
          开发用 JSON 预览
        </summary>
        <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-zinc-950 p-4 text-xs leading-5 text-zinc-100">
          {JSON.stringify(tripPlan, null, 2)}
        </pre>
      </details>
    </div>
  );
}
