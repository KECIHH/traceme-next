import type { DailyItinerary } from "@/lib/schemas/trip";

import { VerifyBadge } from "./verify-badge";

type DayItineraryCardProps = {
  day: DailyItinerary;
};

const timeOfDayLabels: Record<DailyItinerary["items"][number]["timeOfDay"], string> = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
  fullDay: "全天",
};

type ItineraryItem = DailyItinerary["items"][number];

const mealPattern = /早餐|午餐|晚餐|用餐|餐饮|餐厅|美食|小吃|夜宵|火锅|川菜|茶馆|喝茶|风味/i;
const transportPattern =
  /出发|前往|抵达|返程|交通|机场|车站|高铁|航班|地铁|打车|网约车|出租车|换乘|市内交通|耗时|班次|票价/i;

function getItemSearchText(item: ItineraryItem) {
  return [item.title, item.description, item.location].filter(Boolean).join(" ");
}

function isMealItem(item: ItineraryItem) {
  return mealPattern.test(getItemSearchText(item));
}

function isTransportItem(item: ItineraryItem) {
  return (
    item.variableInfoTypes.includes("transportDuration") ||
    item.variableInfoTypes.includes("transportPrice") ||
    transportPattern.test(getItemSearchText(item))
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 text-zinc-500">
      {children}
    </div>
  );
}

function RelatedItemList({
  emptyText,
  items,
}: {
  emptyText: string;
  items: ItineraryItem[];
}) {
  if (items.length === 0) {
    return <EmptyState>{emptyText}</EmptyState>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li
          key={`${item.timeOfDay}-${item.title}-${index}`}
          className="min-w-0 rounded-md bg-white p-3 text-sm leading-6 text-zinc-700 ring-1 ring-zinc-200"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
              {timeOfDayLabels[item.timeOfDay]}
            </span>
            <span className="min-w-0 break-words font-medium text-zinc-950">{item.title}</span>
            <VerifyBadge needVerify={item.needVerify} />
          </div>
          {item.location ? (
            <p className="mt-2 break-words text-xs font-medium text-zinc-500">
              {item.location}
            </p>
          ) : null}
          <p className="mt-2 break-words">{item.description}</p>
          {item.verifyNote ? (
            <p className="mt-2 break-words rounded-md bg-amber-50 p-2 text-xs leading-5 text-amber-900">
              {item.verifyNote}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function DayItineraryCard({ day }: DayItineraryCardProps) {
  const items = day.items ?? [];
  const verifyItems = items.filter((item) => item.needVerify);
  const mealItems = items.filter(isMealItem);
  const transportItems = items.filter(isTransportItem);

  return (
    <article className="min-w-0 space-y-4 rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-700">
            第 {day.day} 天 · {day.date}
          </p>
          <h3 className="mt-1 break-words text-lg font-semibold text-zinc-950">
            {day.title}
          </h3>
          <p className="mt-2 break-words text-sm leading-6 text-zinc-600">{day.summary}</p>
        </div>
        <span className="inline-flex w-fit shrink-0 rounded-md bg-white px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
          {items.length} 项安排
        </span>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-zinc-900">时间段安排</h4>
        {items.length > 0 ? (
          <ol className="mt-3 space-y-3">
            {items.map((item, index) => (
              <li
                key={`${day.day}-${item.timeOfDay}-${item.title}-${index}`}
                className="min-w-0 rounded-md border border-zinc-200 bg-white p-3"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                    {timeOfDayLabels[item.timeOfDay]}
                  </span>
                  <h5 className="min-w-0 break-words text-sm font-semibold text-zinc-950">
                    {item.title}
                  </h5>
                  <VerifyBadge needVerify={item.needVerify} />
                </div>
                {item.location ? (
                  <p className="mt-2 break-words text-xs font-medium text-zinc-500">
                    {item.location}
                  </p>
                ) : null}
                <p className="mt-2 break-words text-sm leading-6 text-zinc-700">
                  {item.description}
                </p>
                {item.verifyNote ? (
                  <p className="mt-2 break-words rounded-md bg-amber-50 p-2 text-xs leading-5 text-amber-900">
                    {item.verifyNote}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-3">
            <EmptyState>当天暂无时间段安排。</EmptyState>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900">餐饮安排</h4>
          <div className="mt-2 min-w-0">
            <RelatedItemList emptyText="当天暂无可识别的餐饮安排。" items={mealItems} />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-900">交通提示</h4>
          <div className="mt-2 min-w-0">
            <RelatedItemList emptyText="当天暂无可识别的交通提示。" items={transportItems} />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-zinc-900">当日确认事项</h4>
        {verifyItems.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {verifyItems.map((item, index) => (
              <li
                key={`${day.day}-verify-${item.title}-${index}`}
                className="min-w-0 rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-950"
              >
                <span className="font-medium">{item.title}</span>
                {item.verifyNote ? (
                  <span className="break-words">：{item.verifyNote}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-2">
            <EmptyState>当天暂无单独确认事项。</EmptyState>
          </div>
        )}
      </div>
    </article>
  );
}
