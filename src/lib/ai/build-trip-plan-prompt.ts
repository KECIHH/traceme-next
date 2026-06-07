import { calculateTripDays } from "@/lib/utils/date";
import type { GenerateTripPlanRequest } from "@/lib/schemas/trip";
import type { TripPlanPrompt } from "@/lib/ai/ai-provider";

const TRIP_PLAN_JSON_SHAPE = `{
  "overview": string,
  "dailyItinerary": [{ "day": number, "date": "YYYY-MM-DD", "title": string, "summary": string, "items": [{ "timeOfDay": "morning" | "afternoon" | "evening" | "fullDay", "title": string, "description": string, "location": string, "needVerify": boolean, "verifyNote": string, "variableInfoTypes": ("ticket" | "openingHours" | "transportDuration" | "transportPrice" | "reservation" | "weather")[] }] }],
  "attractions": [{ "name": string, "reason": string, "suggestedDuration": string, "ticketInfo": string, "openingHours": string, "needVerify": boolean, "verifyNote": string }],
  "foodSuggestions": [{ "areaOrRestaurant": string, "cuisine": string, "reason": string, "priceLevel": "budget" | "midRange" | "premium" | "unknown", "needVerify": boolean, "verifyNote": string }],
  "accommodationSuggestions": [{ "area": string, "reason": string, "priceLevel": "budget" | "midRange" | "premium" | "unknown", "needVerify": boolean, "verifyNote": string }],
  "transportation": [{ "route": string, "method": string, "description": string, "estimatedDuration": string, "estimatedPrice": string, "needVerify": boolean, "verifyNote": string }],
  "budgetBreakdown": [{ "category": "transportation" | "accommodation" | "food" | "attractions" | "shopping" | "other", "amount": number, "currency": "CNY", "description": string, "needVerify": true, "verifyNote": string }],
  "packingChecklist": [{ "category": "documents" | "clothing" | "electronics" | "health" | "other", "items": string[] }],
  "riskReminders": [{ "title": string, "description": string, "needVerify": boolean, "verifyNote": string }],
  "userVerifyItems": [{ "category": "ticketReservation" | "openingHours" | "hotelPrice" | "transportSchedulePrice" | "weather" | "other", "item": string, "reason": string, "suggestedAction": string }],
  "disclaimer": string
}`;

export function buildTripPlanPrompt(request: GenerateTripPlanRequest): TripPlanPrompt {
  const days = calculateTripDays(request.startDate, request.endDate);

  return {
    systemPrompt: [
      "你是旅行计划草稿助手。",
      "你只根据用户输入生成结构化旅行计划草稿，不查询实时票务、酒店、天气、地图、交通、官网或联网搜索。",
      "不要声称你查询了实时票务、酒店、天气、地图、交通、官网或搜索结果。",
      "不要编造准确门票、营业时间、酒店价格、交通班次、实时天气、预约状态、交通耗时或交通价格。",
      "所有门票、营业时间、酒店价格、交通班次、交通耗时、交通价格、实时天气、预约状态、排队情况等可变信息都必须设置 needVerify: true，并写清 verifyNote。",
      "所有可变信息还必须覆盖进 userVerifyItems；userVerifyItems 至少包含 ticketReservation、openingHours、hotelPrice、transportSchedulePrice、weather 五类。",
      "预算只能作为估算参考，budgetBreakdown 中每一项都必须 needVerify: true。",
      "用户输入的 budget.scope 表示预算口径：total 表示 budget.amount 是总预算，perPerson 表示 budget.amount 是人均预算。预算拆分应按整趟旅行总预算估算。",
      "输出必须是完整且合法的 minified JSON object。不要输出 Markdown。不要输出代码块。不要输出 JSON 以外的解释文字。",
      "字段结构里的 string、number、boolean 是类型占位符，输出时必须替换成真实 JSON 值，不能照抄类型名。",
      "不要输出注释、尾逗号、单引号、undefined、NaN 或未加引号的字段名。",
      "dailyItinerary 的条目数量必须等于用户输入日期计算出的天数。",
      "必须包含 disclaimer 和 userVerifyItems。",
      "服务端会覆盖 id、generatedAt、generationMode、input 等元信息；不要依赖这些字段表达计划内容。",
    ].join("\n"),
    userPrompt: [
      "请根据以下用户输入生成旅行计划草稿。",
      "",
      `用户输入 JSON：${JSON.stringify({ ...request, days })}`,
      "",
      "返回一个 JSON 对象，字段必须匹配当前 TripPlan 内容结构。可以省略 id、generatedAt、generationMode、input；如果包含这些字段，服务端也会覆盖它们。",
      "",
      "必须返回的内容字段结构如下：",
      TRIP_PLAN_JSON_SHAPE,
      "",
      "额外约束：",
      `1. dailyItinerary 必须恰好包含 ${days ?? "用户日期范围"} 天。`,
      "2. 每天只写 1 个 item，优先 timeOfDay=fullDay；每个 title/summary/description 尽量短。",
      "3. attractions、foodSuggestions、accommodationSuggestions、transportation、budgetBreakdown、packingChecklist、riskReminders 各写 1 项即可。",
      "4. userVerifyItems 必须恰好写 5 项，类别分别为 ticketReservation、openingHours、hotelPrice、transportSchedulePrice、weather。",
      "5. 所有包含票务、时间、酒店、交通、天气、预算估算的信息都必须 needVerify: true，并写简短 verifyNote。",
      "6. 不要把票价、营业时间、酒店价格、交通班次、天气、预约状态、交通耗时写成确定事实。",
      "7. disclaimer 必须提醒用户本计划仅供规划参考，出发前自行确认实时信息。",
      "8. 如果 budget.scope 是 perPerson，请按 budget.amount * travelers 理解整趟旅行总预算，再生成 budgetBreakdown。",
      "9. 为避免超时，overview、summary、reason、description、verifyNote、disclaimer 都必须非常简短。",
      "10. 各建议列表只写 1 项，不要扩写解释。",
      "11. 输出必须是一个完整 JSON object，不能是 JSON array 或字符串，也不能包含注释或尾逗号。",
      "12. dailyItinerary.items[].variableInfoTypes 只能使用 ticket、openingHours、transportDuration、transportPrice、reservation、weather；不要写 ticketReservation、hotelPrice、transportSchedulePrice 或 other；不确定时写空数组 []。",
    ].join("\n"),
  };
}
