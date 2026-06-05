# AI 旅行计划生成与管理网站 - 数据与 API 设计

## 关键假设

- MVP 没有数据库，所有数据只在一次请求和一次页面会话中使用。
- 唯一业务 API 为 `POST /api/travel-plans/generate`。
- 类型和 Zod schema 统一放在 `src/lib/schemas/trip.ts`。
- AI 返回必须被解析为 `TripPlan` 并通过 `TripPlanSchema`。
- 所有实时或易变化信息使用 `needVerify: true` 或进入 `verificationItems`。

## MVP 范围

MVP 数据模型只支撑表单提交、AI 生成、页面展示、Markdown 导出。不得为登录、历史记录、版本回滚、协作、支付、预订提前添加复杂字段。

## 非 MVP 范围

第一版不设计：

- 用户表、行程表、版本表。
- 收藏、分享、评论、权限。
- 支付、订单、票务、酒店库存。
- 地图路线实体。
- 天气实体。
- 搜索引用来源表。

## 后续扩展

后续如果增加历史记录，可以将 `TripPlan` 作为 JSON 字段保存，并额外增加 `id`、`userId`、`createdAt`、`updatedAt`、`version`。这些字段不进入 MVP 的 `TripPlan`。

## API

### `POST /api/travel-plans/generate`

用途：根据用户输入生成一份旅行计划草稿。

请求体类型：`TripGenerationRequest`

响应体类型：`TripGenerationResponse`

错误响应类型：`ApiErrorResponse`

### Request

```ts
export type TravelStyle =
  | "relaxed"
  | "balanced"
  | "intensive"
  | "family"
  | "food"
  | "culture"
  | "nature";

export interface TripGenerationRequest {
  departureCity: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: {
    amount: number;
    currency: "CNY";
  };
  preferences: string[];
  travelStyle: TravelStyle;
  specialRequests?: string;
}
```

请求校验规则：

- `departureCity` 必填，去除空格后长度 1 到 50。
- `destination` 必填，去除空格后长度 1 到 80。
- `startDate`、`endDate` 必须是 `YYYY-MM-DD`。
- `endDate` 不早于 `startDate`。
- `days` 后端根据日期计算，不由前端传入。
- `travelers` 为 1 到 20 的整数。
- `budget.amount` 大于 0，建议最大不超过 1000000。
- `budget.currency` MVP 固定为 `CNY`。
- `preferences` 最多 12 项，每项 1 到 30 字。
- `specialRequests` 可选，最多 500 字。

### Success Response

```ts
export interface TripGenerationResponse {
  tripPlan: TripPlan;
  warnings: string[];
  generatedAt: string;
}
```

`warnings` 用于放置系统级提醒，例如“本计划不包含实时票价和天气信息”。`generatedAt` 使用 ISO datetime 字符串。

### Error Response

```ts
export interface ApiErrorResponse {
  error: {
    code:
      | "INVALID_REQUEST"
      | "AI_PROVIDER_NOT_CONFIGURED"
      | "AI_INVALID_JSON"
      | "AI_SCHEMA_VALIDATION_FAILED"
      | "INTERNAL_ERROR";
    message: string;
    details?: unknown;
  };
}
```

HTTP 状态码：

- `400 INVALID_REQUEST`: 请求字段缺失或格式错误。
- `500 AI_PROVIDER_NOT_CONFIGURED`: 服务端缺少 AI Provider 必要环境变量。
- `502 AI_INVALID_JSON`: AI 返回无法解析为 JSON。
- `502 AI_SCHEMA_VALIDATION_FAILED`: AI JSON 不符合 `TripPlanSchema`。
- `500 INTERNAL_ERROR`: 未预期错误。

## TripPlan 类型

```ts
export interface TripPlan {
  overview: string;
  departureCity: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: number;
  travelers: number;
  budget: BudgetSummary;
  travelStyle: string;
  dailyItinerary: DayPlan[];
  attractions: AttractionPlan[];
  diningSuggestions: DiningSuggestion[];
  accommodationSuggestions: AccommodationSuggestion[];
  transportation: TransportationPlan[];
  budgetBreakdown: BudgetBreakdownItem[];
  packingList: string[];
  riskReminders: string[];
  verificationItems: VerificationItem[];
  disclaimer: string;
}

export interface BudgetSummary {
  totalAmount: number;
  currency: "CNY";
  perPersonEstimate: number;
  notes: string;
  needVerify: boolean;
}

export interface DayPlan {
  day: number;
  date: string;
  title: string;
  summary: string;
  items: ItineraryItem[];
}

export interface ItineraryItem {
  timeOfDay: "morning" | "afternoon" | "evening" | "fullDay";
  title: string;
  description: string;
  location?: string;
  needVerify: boolean;
  verifyNote?: string;
}

export interface AttractionPlan {
  name: string;
  reason: string;
  suggestedDuration: string;
  ticketInfo?: string;
  openingHours?: string;
  needVerify: boolean;
  verifyNote?: string;
}

export interface DiningSuggestion {
  areaOrRestaurant: string;
  cuisine: string;
  reason: string;
  priceLevel: "budget" | "midRange" | "premium" | "unknown";
  needVerify: boolean;
  verifyNote?: string;
}

export interface AccommodationSuggestion {
  area: string;
  reason: string;
  priceLevel: "budget" | "midRange" | "premium" | "unknown";
  needVerify: boolean;
  verifyNote?: string;
}

export interface TransportationPlan {
  route: string;
  method: string;
  description: string;
  estimatedDuration?: string;
  needVerify: boolean;
  verifyNote?: string;
}

export interface BudgetBreakdownItem {
  category: "transportation" | "accommodation" | "dining" | "attractions" | "shopping" | "other";
  amount: number;
  currency: "CNY";
  description: string;
  needVerify: boolean;
}

export interface VerificationItem {
  item: string;
  reason: string;
  suggestedAction: string;
}
```

## Zod Schema 设计

`src/lib/schemas/trip.ts` 需要导出：

```ts
export const TripGenerationRequestSchema = z.object(...);
export const TripPlanSchema = z.object(...);
export const TripGenerationResponseSchema = z.object(...);

export type TripGenerationRequest = z.infer<typeof TripGenerationRequestSchema>;
export type TripPlan = z.infer<typeof TripPlanSchema>;
export type TripGenerationResponse = z.infer<typeof TripGenerationResponseSchema>;
```

Schema 需要包含业务 refine：

- `endDate >= startDate`。
- `days` 应等于 `startDate` 到 `endDate` 的自然日差加 1。
- `dailyItinerary.length` 应与 `days` 一致。
- 所有包含 `ticketInfo`、`openingHours`、`estimatedDuration`、价格等级、住宿价格相关描述的条目，必须允许并优先要求 `needVerify: true`。

MVP 可先用 schema 保证字段结构，再用单独 helper 做 `days` 和 `dailyItinerary.length` 的一致性检查，避免 schema 过于复杂。

## Mock 数据策略

创建 `src/lib/ai/mock-provider.ts` 时：

- 返回固定 JSON 字符串，而不是直接返回对象，用来模拟真实 AI 返回。
- mock JSON 必须通过 `TripPlanSchema`。
- mock 内容必须包含 `verificationItems`。
- 涉及门票、营业时间、酒店价格、交通耗时、预算估算的内容必须设置 `needVerify: true`。

## API 示例

请求：

```json
{
  "departureCity": "上海",
  "destination": "成都",
  "startDate": "2026-07-01",
  "endDate": "2026-07-05",
  "travelers": 2,
  "budget": {
    "amount": 8000,
    "currency": "CNY"
  },
  "preferences": ["美食", "文化", "轻松"],
  "travelStyle": "balanced",
  "specialRequests": "希望每天不要太赶"
}
```

成功响应只示意外层结构：

```json
{
  "tripPlan": {
    "overview": "这是一份成都 5 天游草稿，节奏适中，重点覆盖美食与文化体验。",
    "departureCity": "上海",
    "destination": "成都",
    "startDate": "2026-07-01",
    "endDate": "2026-07-05",
    "days": 5,
    "travelers": 2,
    "budget": {
      "totalAmount": 8000,
      "currency": "CNY",
      "perPersonEstimate": 4000,
      "notes": "预算拆分为 AI 估算，仅供规划参考。",
      "needVerify": true
    },
    "travelStyle": "balanced",
    "dailyItinerary": [],
    "attractions": [],
    "diningSuggestions": [],
    "accommodationSuggestions": [],
    "transportation": [],
    "budgetBreakdown": [],
    "packingList": [],
    "riskReminders": [],
    "verificationItems": [],
    "disclaimer": "本计划由 AI 生成，仅供旅行规划参考。出发前请自行确认门票、营业时间、交通、天气、预约和价格等实时信息。"
  },
  "warnings": ["本计划不包含实时票价、实时酒店价格、实时天气或实时交通数据。"],
  "generatedAt": "2026-06-05T04:00:00.000Z"
}
```

示例中的数组在真实实现中不得为空，应由 AI 或 mock 数据填充完整内容。

