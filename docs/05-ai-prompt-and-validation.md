# AI 旅行计划生成与管理网站 - AI Prompt 与校验策略

> **状态说明（第 49 轮）**：本文是历史设计/早期 MVP 参考，保留用于追溯旧规划，不再作为当前执行依据。当前事实以 `docs/00-project-brief-and-roadmap.md`、`docs/08-project-state.md`、`docs/13-next-feature-roadmap.md`、`docs/14-delete-restore-design.md` 和当前代码为准。

## 关键假设

- AI 调用只发生在服务端。
- AI Provider 的具体 SDK、模型、价格、额度、接口能力需要实现前查官方文档确认。
- Prompt Builder 输出 `systemPrompt` 和 `userPrompt`。
- AI 必须尽量只返回 JSON，不返回 Markdown 包裹或解释文本。
- 后端必须对 AI 返回做 JSON 解析和 `TripPlanSchema` 校验。

## MVP 范围

MVP 实现：

- `buildTripPlanPrompt(request: TripGenerationRequest)`。
- `AIProvider.generateTripPlanJson(input)`。
- JSON 提取和解析。
- `TripPlanSchema` 校验。
- AI 返回格式错误时有限重试或返回错误。
- 对易变化信息执行 `needVerify` 规则。

## 非 MVP 范围

第一版不做：

- 联网搜索增强。
- 地图、天气、票务、酒店实时 API。
- 多模型自动路由。
- AI 评分体系。
- 长期记忆或用户偏好画像。
- 复杂 prompt 版本管理平台。

## 后续扩展

后续可以增加：

- 网络参考资料注入 prompt。
- 多 Provider 失败降级。
- 结构化输出模式或工具调用模式，前提是查阅所选 Provider 官方文档确认能力。
- Prompt 版本号和 A/B 测试。
- 行程质量评分 prompt。

## Prompt Builder 输入

输入类型固定为：

```ts
TripGenerationRequest
```

Prompt Builder 不直接读取环境变量，不调用 AI，不做网络请求。它只负责将用户输入转换成明确的 AI 指令。

## System Prompt 草案

```txt
你是一个旅行计划草稿生成助手。你的任务是根据用户输入生成结构化 JSON 格式的旅行计划草稿。

重要边界：
1. 你不是实时票务、酒店、地图、天气或搜索系统。
2. 不要把门票价格、营业时间、酒店价格、交通班次、实时天气、预约状态、交通耗时等易变化信息写成确定事实。
3. 如果必须提到这些信息，必须设置 needVerify: true，并在 verifyNote 中说明用户出发前需要自行确认。
4. 用户自行确认事项必须写入 verificationItems。
5. 预算、耗时、价格等级只能作为规划参考，不得承诺准确。
6. 只返回 JSON，不要返回 Markdown，不要返回解释文本，不要使用代码块包裹。
7. 返回 JSON 必须符合 TripPlan 类型，字段名必须完全一致。
8. disclaimer 必须提醒用户本计划由 AI 生成，仅供参考，出发前自行确认实时信息。
```

## User Prompt 草案

```txt
请根据以下用户输入生成旅行计划草稿：

departureCity: {departureCity}
destination: {destination}
startDate: {startDate}
endDate: {endDate}
days: {computedDays}
travelers: {travelers}
budget.amount: {budget.amount}
budget.currency: CNY
preferences: {preferences}
travelStyle: {travelStyle}
specialRequests: {specialRequests}

请返回一个 JSON 对象，结构必须符合 TripPlan：

{
  "overview": string,
  "departureCity": string,
  "destination": string,
  "startDate": string,
  "endDate": string,
  "days": number,
  "travelers": number,
  "budget": BudgetSummary,
  "travelStyle": string,
  "dailyItinerary": DayPlan[],
  "attractions": AttractionPlan[],
  "diningSuggestions": DiningSuggestion[],
  "accommodationSuggestions": AccommodationSuggestion[],
  "transportation": TransportationPlan[],
  "budgetBreakdown": BudgetBreakdownItem[],
  "packingList": string[],
  "riskReminders": string[],
  "verificationItems": VerificationItem[],
  "disclaimer": string
}

约束：
1. dailyItinerary 的数量必须等于 days。
2. 每天至少包含 morning、afternoon、evening 中的两个时间段安排。
3. attractions、diningSuggestions、accommodationSuggestions、transportation、budgetBreakdown、packingList、riskReminders、verificationItems 都不能为空。
4. 任何门票、营业时间、酒店价格、交通班次、天气、预约状态、交通耗时相关内容，都必须 needVerify: true。
5. 如果无法确定实时信息，不要编造确定结论，只写成参考建议，并加入 verificationItems。
6. 输出必须是合法 JSON。
```

## needVerify 规则

必须设置 `needVerify: true` 的场景：

- `AttractionPlan.ticketInfo`
- `AttractionPlan.openingHours`
- `DiningSuggestion` 中涉及具体价格、排队、营业状态。
- `AccommodationSuggestion` 中涉及价格、房态、位置便利性强承诺。
- `TransportationPlan.estimatedDuration`
- `TransportationPlan` 中涉及班次、拥堵、运营时间。
- `BudgetBreakdownItem` 中的预算估算。
- `ItineraryItem` 中涉及预约、开放状态、演出时间、交通耗时。

必须进入 `verificationItems` 的事项：

- 门票价格和购票渠道。
- 景区营业时间和闭园日。
- 酒店价格和房态。
- 交通班次和实际耗时。
- 天气和极端天气风险。
- 预约状态和证件要求。
- 当地临时管制或节假日限流。

## JSON 解析策略

推荐实现函数：

```ts
function parseTripPlanJson(raw: string): unknown
```

解析流程：

1. 先对 `raw` 执行 `JSON.parse`。
2. 如果失败，尝试提取第一个完整 JSON object 字符串。
3. 再次 `JSON.parse`。
4. 仍失败则抛出 `AI_INVALID_JSON`。

注意：提取 JSON 只能作为容错，不应掩盖 AI 输出不稳定的问题。错误日志可记录原始长度和解析阶段，不要在用户界面展示完整原始响应。

## Schema 校验策略

推荐实现函数：

```ts
function validateTripPlan(value: unknown): TripPlan
```

校验流程：

1. 使用 `TripPlanSchema.safeParse(value)`。
2. 校验失败则抛出 `AI_SCHEMA_VALIDATION_FAILED`。
3. 校验成功后执行一致性检查：
   - `days` 是否与 `startDate` 和 `endDate` 匹配。
   - `dailyItinerary.length` 是否等于 `days`。
   - `verificationItems.length > 0`。
4. 如果一致性检查失败，按 schema 校验失败处理。

## 重试策略

MVP 使用简单有限重试：

- 默认最多 1 次重试。
- 仅对 `AI_INVALID_JSON` 和 `AI_SCHEMA_VALIDATION_FAILED` 重试。
- 重试 prompt 需要明确指出上次输出不符合 JSON 或 schema，并要求只返回修正后的 JSON。
- 如果重试仍失败，返回 `502` 和面向用户的错误文案。

不做无限重试，避免成本和延迟不可控。

## Provider 配置

环境变量建议：

```txt
AI_PROVIDER=mock | primary
AI_API_KEY=...
AI_MODEL=...
```

规则：

- 本地开发初期使用 `AI_PROVIDER=mock`。
- `AI_API_KEY` 只允许服务端读取。
- 不能把 `AI_API_KEY` 放入 `NEXT_PUBLIC_` 前缀变量。
- 具体 Provider 的 SDK、base URL、模型名、参数、价格和额度必须查官方文档确认。

## AI 验收标准

- mock provider 返回的字符串能解析为合法 `TripPlan`。
- primary provider 的返回必须经过同样的解析和 schema 校验。
- AI 输出不能只是一段自然语言。
- AI 输出不能省略 `verificationItems` 和 `disclaimer`。
- 易变化信息不得以确定事实展示。
- 解析失败或校验失败时，API 返回可理解错误，不让前端收到半成品 `TripPlan`。
