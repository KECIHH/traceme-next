# 项目状态记录 - MVP 编码阶段第 2 轮

## 记录时间

- 日期：2026-06-05
- 阶段：MVP 编码阶段第 2 轮

## 已阅读的项目文档

本轮已重新阅读并依据以下文档确认项目边界：

- `docs/01-product-plan.md`
- `docs/02-technical-architecture.md`
- `docs/03-data-and-api-design.md`
- `docs/04-ui-and-components.md`
- `docs/05-ai-prompt-and-validation.md`
- `docs/06-roadmap.md`
- `docs/07-implementation-tasks.md`
- `docs/08-project-state.md`

## 本轮新增依赖

- 新增 `zod`。
- 新增原因：本轮进入共享数据契约阶段，需要运行时校验 `GenerateTripPlanRequest` 和 `TripPlan`，并通过 `z.infer` 从同一份 schema 推导 TypeScript 类型，避免类型和校验规则分离后不一致。
- 安装记录：普通 `npm install zod` 曾在本机超时；随后使用 `npm install zod --ignore-scripts --no-audit --no-fund --prefer-offline` 成功完成并写入 `package.json` 与 `package-lock.json`。

## 本轮已完成

- 已创建 `src/lib/utils/date.ts`：
  - `isIsoDateOnly(value)` 校验合法 `YYYY-MM-DD` 日期。
  - `getIsoDateTime(value)` 使用 UTC 计算日期时间戳。
  - `calculateTripDays(startDate, endDate)` 计算包含首尾两天的自然日天数。
- 已创建 `src/lib/schemas/trip.ts`：
  - `GenerateTripPlanRequestSchema`
  - `TripPlanSchema`
  - `GenerationModeSchema`
  - `PaceSchema`
  - `BudgetSchema`
  - `GenerateTripPlanRequest`
  - `TripPlan`
  - 以及由 Zod schema 推导出的必要子类型。
- 已创建 `src/lib/mock/mock-trip-plan.ts`：
  - 导出完整 `mockTripPlan`。
  - 示例内容为“上海出发成都 5 天 4 晚”。
  - mock 模块内使用 `TripPlanSchema.parse(...)` 校验并导出数据。
  - 另导出 `mockTripPlanValidationResult` 便于后续调试或测试复用。

## 当前数据契约口径

- 本轮以最新要求为准，暂不沿用旧文档里的 `TripGenerationRequestSchema`、`travelStyle`、`specialRequests`、`diningSuggestions`、`packingList`、`verificationItems` 作为主契约。
- 请求 schema 当前使用：
  - `departureCity`
  - `destination`
  - `startDate`
  - `endDate`
  - `travelers`
  - `budget`
  - `preferences`
  - `customPreference`
  - `pace`
  - `generationMode`
- `generationMode` 在 MVP 当前阶段只允许 `quick`。
- `referenceEnhanced` 仅作为后续规划，本轮没有开放真实能力，也没有进入当前枚举。
- `TripPlan` 当前使用：
  - `id`
  - `generatedAt`
  - `generationMode`
  - `input`
  - `overview`
  - `dailyItinerary`
  - `attractions`
  - `foodSuggestions`
  - `accommodationSuggestions`
  - `transportation`
  - `budgetBreakdown`
  - `packingChecklist`
  - `riskReminders`
  - `userVerifyItems`
  - `disclaimer`

## 已实现的业务校验

- `startDate`、`endDate` 必须是合法 `YYYY-MM-DD`。
- `endDate` 不能早于 `startDate`。
- `travelers` 必须是 1 到 20 的整数。
- `budget.amount` 必须为正数，最大值为 1,000,000。
- `budget.currency` 固定为 `CNY`。
- `preferences` 至少 1 项，最多 12 项，每项去除空白后不能为空。
- `TripPlan.input.days` 必须等于日期区间自然日天数。
- `dailyItinerary.length` 必须等于 `input.days`。
- `userVerifyItems` 不能为空，并必须覆盖：
  - 门票/预约
  - 营业时间
  - 酒店价格
  - 交通班次/价格
  - 天气
- `disclaimer` 不能为空。
- 预算估算、门票、营业时间、交通耗时、交通价格、酒店价格、实时天气等易变信息如果出现在对应结构化字段或可扫描文本字段中，schema 要求 `needVerify: true`。
- `overview` 和 `disclaimer` 等顶层文本如果出现易变信息关键词，schema 要求这些类别必须进入 `userVerifyItems` 覆盖范围。

## Mock 数据状态

- `mockTripPlan` 已覆盖：
  - 5 天每日行程
  - 景点建议
  - 餐饮建议
  - 住宿建议
  - 交通建议
  - 预算拆分
  - 打包清单
  - 风险提醒
  - 用户自行确认事项
  - 免责声明
- `mockTripPlan` 没有把门票、营业时间、酒店价格、实时天气、交通班次、交通价格或交通耗时包装成确定事实。
- 相关易变内容均已标记 `needVerify: true` 或进入 `userVerifyItems`。

## API 路径状态

- 已将 `docs/01-product-plan.md` 到 `docs/07-implementation-tasks.md` 中的业务 API 路径统一为 `/api/travel-plans/generate`。
- 本轮严格不实现 API Route。
- 当前代码中仍没有 `src/app/api/travel-plans/generate/route.ts`。

## 当前仍未实现

- 旅行计划生成页面
- API Route
- Service
- mock provider
- 真实 AI 调用
- 用户登录
- 数据库
- 地图
- 天气
- 搜索增强
- PDF 导出
- Markdown 导出

## 验证结果

- `npm run lint` 已通过。
- `npm run build` 已通过。
- `npx tsc --noEmit` 已通过。
- 使用 Node + TypeScript 临时转译脚本校验 `mockTripPlanValidationResult` 已通过，未写入项目依赖。
- `mockTripPlan` 已通过 `TripPlanSchema.parse(...)` 校验。

## 下一步建议

下一轮建议基于已统一的 `/api/travel-plans/generate` 路径，实现 mock provider、JSON 字符串返回、trip generation service 和 API Route。
