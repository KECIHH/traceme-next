# 项目状态记录 - MVP 编码阶段第 5 轮

## 记录时间

- 日期：2026-06-05
- 阶段：MVP 编码阶段第 5 轮

## 第 5 轮已完成

- 已实现完整旅行计划结果展示组件 `src/components/trip/trip-plan-result.tsx`。
- 已新增少量结果展示子组件：
  - `src/components/trip/verify-badge.tsx`
  - `src/components/trip/section-card.tsx`
  - `src/components/trip/day-itinerary-card.tsx`
- 已更新 `src/app/page.tsx`：
  - 成功状态下优先展示完整 `TripPlanResult`。
  - 原基础结果预览已不再作为主展示内容。
  - 开发用 JSON 预览仅保留在 `TripPlanResult` 底部折叠区域。
  - `idle`、`loading`、`error`、`success` 状态继续沿用现有页面状态。
- `TripPlanResult` 当前覆盖以下区块：
  - 旅行总览 `overview`
  - 基本信息 `input`
  - 每日行程 `dailyItinerary`
  - 景区安排 `attractions`
  - 餐饮建议 `foodSuggestions`
  - 住宿建议 `accommodationSuggestions`
  - 交通方案 `transportation`
  - 预算拆分 `budgetBreakdown`
  - 准备清单 `packingChecklist`
  - 风险提醒 `riskReminders`
  - 用户自行确认事项 `userVerifyItems`
  - 免责声明 `disclaimer`
- 已按当前实际 `TripPlanSchema` 展示结果：
  - `dailyItinerary.items` 作为每日时间段安排展示。
  - 当前 schema 没有独立 `schedule`、`meals`、`transportTips`、`verifyItems` 字段，因此不在前端伪造这些结构；缺失区块显示友好空状态。
  - 当前 schema 没有 `riskReminders.severity` 和 `riskReminders.mitigation` 字段，因此风险提醒使用 `needVerify` 与 `verifyNote` 呈现温和确认提示。
  - 当前 schema 没有 `budgetBreakdown.savingTips` 字段，因此预算区块显示面向用户的省钱建议空状态。
- 已统一 `needVerify: true` 的展示：
  - 使用 `VerifyBadge` 显示“需确认”“估算参考”“参考草稿”等统一标记。
  - `verifyNote` 会在对应卡片内以醒目的参考提示展示。
  - 景点门票/营业时间、餐饮价格、住宿价格、交通耗时/费用、预算估算等易变信息均以参考或需确认语气展示。
- 已增强结果区块响应式和健壮性：
  - 结果容器和卡片使用 `min-w-0`、`break-words`、响应式网格，降低移动端横向溢出风险。
  - 顶层数组为空时显示友好空状态，不作为页面错误处理。
  - optional 字段不存在时不渲染对应小项。

## 第 5 轮审查后修复

- 已修复审查中提出的每日行程展示体验缺口：
  - `src/components/trip/day-itinerary-card.tsx` 不再让“餐饮安排”和“交通提示”固定显示为缺失字段空状态。
  - 当前仍不扩展 `TripPlanSchema`，而是从每日 `dailyItinerary.items` 中按轻量文本规则派生餐饮相关安排和交通相关提示。
  - 派生出的餐饮/交通条目会继续展示时间段、标题、地点、描述、`VerifyBadge` 和 `verifyNote`。
  - 如果当天确实没有可识别的餐饮或交通条目，则显示更具体的友好空状态。
- 已修复最终审查中提出的预算区块体验问题：
  - `src/components/trip/trip-plan-result.tsx` 的“省钱建议”不再展示 `savingTips` 字段缺失或“本轮不额外生成”等内部实现文案。
  - 当前仍不扩展预算 schema，只展示面向用户的友好建议：优先核对交通与住宿价格，并按实际预算调整餐饮、景点和机动支出。

## 第 4 轮已完成

- 已将 `src/app/page.tsx` 从 Next.js 默认页面改为旅行计划生成工具首页。
- 首页当前包含：
  - 产品标题和简短说明。
  - 旅行信息表单区域。
  - 随机目的地推荐区域。
  - 生成状态区域。
  - 简单结果预览区域。
- 已创建 `src/components/trip/trip-planner-form.tsx`：
  - 使用客户端组件。
  - 表单字段包含 `departureCity`、`destination`、`startDate`、`endDate`、`travelers`、`budget.amount`、`budget.currency`、`budget.scope`、`preferences`、`customPreference`、`pace`。
  - 已实现基础字段校验：必填、日期顺序、人数正整数、预算正数、至少选择一个偏好。
  - 提交中禁用表单提交按钮。
  - `budget.scope` 当前只作为前端表单字段，提交 API 时会合并进 `customPreference`，不改变当前后端 schema。
- 已创建 `src/components/trip/destination-suggestions.tsx`：
  - 使用本地静态目的地数据。
  - 支持“换一批”。
  - 点击推荐项会自动填入表单 `destination`。
  - 推荐文案不暗示实时热度、实时价格或准确数据。
  - 初始推荐批次使用稳定静态列表，避免服务端预渲染和客户端 hydration 时出现不同推荐内容；点击“换一批”后仍会切换推荐批次。
- 已创建 `src/lib/services/travel-plan-client.ts`：
  - 前端只调用本站后端 `POST /api/travel-plans/generate`。
  - 不直接调用第三方 AI API。
  - 不读取或暴露 `AI_API_KEY`。
  - 能处理 `{ ok: true, data }`、`{ ok: false, error }`、HTTP 异常响应和网络错误。
  - `{ ok: true, data }` 的 `data` 会在前端使用 `TripPlanSchema.safeParse(...)` 再校验一次，避免只依赖响应外层结构。
- 当前页面状态支持：
  - `idle`
  - `loading`
  - `success`
  - `error`
- 当前成功后只展示基础结果预览：
  - 计划标题
  - 目的地
  - 天数
  - 旅行风格
  - 摘要
  - `disclaimer`
  - `userVerifyItems`
  - 开发用 JSON 折叠预览
- 当前结果展示仍然是基础预览，不是完整结果页。

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

## 已有依赖状态

- 新增 `zod`。
- 用途：运行时校验 `GenerateTripPlanRequest` 和 `TripPlan`，并通过 `z.infer` 从同一份 schema 推导 TypeScript 类型，避免类型和校验规则分离后不一致。
- 本轮未新增依赖。

## 本轮已完成

以下为第 3 轮已完成内容，仍作为当前 mock API 和数据契约基础：

- 已更新 `src/lib/utils/date.ts`：
  - `isIsoDateOnly(value)` 校验合法 `YYYY-MM-DD` 日期。
  - `getIsoDateTime(value)` 使用 UTC 计算日期时间戳。
  - `calculateTripDays(startDate, endDate)` 计算包含首尾两天的自然日天数。
  - 新增 `addDaysToIsoDate(value, offsetDays)`，供 mock provider 生成每日行程日期。
- 已更新 `src/lib/schemas/trip.ts`：
  - `GenerateTripPlanRequestSchema`
  - `TripPlanSchema`
  - `GenerationModeSchema`
  - `PaceSchema`
  - `BudgetSchema`
  - `GenerateTripPlanRequest`
  - `TripPlan`
  - 以及由 Zod schema 推导出的必要子类型。
  - 请求日期区间新增最多 60 天限制，与 `TripPlan.input.days` 的 schema 上限保持一致。
- 已创建 `src/lib/mock/mock-trip-plan.ts`：
  - 导出完整 `mockTripPlan`。
  - 示例内容为“上海出发成都 5 天 4 晚”。
  - mock 模块内使用 `TripPlanSchema.parse(...)` 校验并导出数据。
  - 另导出 `mockTripPlanValidationResult` 便于后续调试或测试复用。
- 已创建 `src/lib/ai/parse-ai-json.ts`：
  - `parseAiJson(raw)` 只执行标准 `JSON.parse`。
  - `AiJsonParseError` 用于标识 JSON 解析失败。
  - 不做 AI 输出修复、不提取 Markdown 代码块、不补业务字段。
- 已创建 `src/lib/ai/mock-provider.ts`：
  - `generateMockTripPlanJson(request)` 基于现有 `mockTripPlan` 生成 JSON 字符串。
  - 不调用真实 AI API，不读取 `AI_API_KEY` 或任何 AI 环境变量。
  - 返回内容会同步用户提交的 `departureCity`、`destination`、`startDate`、`endDate`、`travelers`、`budget`、`preferences`、`customPreference`、`pace`、`generationMode`。
  - `days` 根据 `startDate` 和 `endDate` 计算。
  - `dailyItinerary` 会根据天数复用 mock 日程模板并重写 `day`、`date`、`title`、`summary`，确保长度等于 `input.days`。
- 已创建 `src/lib/services/generate-trip-plan.ts`：
  - `generateTripPlan(request)` 接收已校验的 `GenerateTripPlanRequest`。
  - 调用 mock provider 获取 JSON 字符串。
  - 调用 `parseAiJson` 解析。
  - 使用 `TripPlanSchema.safeParse` 校验。
  - 提供 `TripGenerationError` 和错误码类型。
- 已创建 `src/app/api/travel-plans/generate/route.ts`：
  - 实现 `POST /api/travel-plans/generate`。
  - 请求 body 使用 `GenerateTripPlanRequestSchema` 校验。
  - 成功返回 `{ ok: true, data: TripPlan }`。
  - 失败返回 `{ ok: false, error: { code, message, requestId } }`。
  - 校验失败返回 HTTP 400 和 `BAD_REQUEST`。
  - mock provider、AI JSON 解析、AI schema 校验失败返回 HTTP 502。
  - 未预期错误返回 HTTP 500 和 `INTERNAL_ERROR`。

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
- 旅行日期区间最多 60 天。
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
- 当前已实现唯一业务 API：`POST /api/travel-plans/generate`。
- 当前 API 返回标准外层结构：
  - 成功：`{ ok: true, data: TripPlan }`
  - 失败：`{ ok: false, error: { code, message, requestId } }`
- 当前基础错误码：
  - `BAD_REQUEST`
  - `MOCK_PROVIDER_ERROR`
  - `AI_JSON_PARSE_ERROR`
  - `AI_SCHEMA_VALIDATION_ERROR`
  - `INTERNAL_ERROR`
- 当前生成链路是 mock provider，不是真实 AI。

## 当前仍未实现

- 真实 AI 调用
- 复制全文
- Markdown 下载
- 用户登录
- 数据库
- 地图
- 天气
- 搜索增强
- PDF 导出
- 真实票价、酒店价格、门票、交通班次、天气等实时数据能力

## 验证结果

- 第 5 轮验证结果：
  - `npm run lint` 已通过。
  - `npm run build` 已通过。
  - `npx tsc --noEmit` 已通过。
  - 浏览器手动验证已通过：
    - 使用生产构建临时端口 `http://127.0.0.1:3100` 验证默认表单提交。
    - 成功后进入 `已生成草稿` 状态，并展示完整 `TripPlanResult`。
    - 桌面视口确认完整结果、基本信息、每日行程、景区安排、餐饮建议、住宿建议、交通方案、预算拆分、准备清单、风险提醒、用户自行确认事项、免责声明和开发用 JSON 折叠预览均可见。
    - 桌面视口确认 `需确认` 与 `估算参考` 标记可见，且无横向溢出。
    - 移动端 390px 视口确认关键区块可见，`scrollWidth` 等于 `clientWidth`，无横向溢出。
- 第 5 轮审查后修复验证结果：
  - `npm run lint` 已通过。
  - `npm run build` 已通过。
  - `npx tsc --noEmit` 已通过。
- 第 5 轮最终审查后文案清理验证结果：
  - `npm run lint` 已通过。
  - `npm run build` 已通过。
  - `npx tsc --noEmit` 已通过。
- 第 4 轮验证结果：
  - `npm run lint` 已通过。
  - `npm run build` 已通过。
  - `npx tsc --noEmit` 已通过。
  - 浏览器手动验证已通过：
    - 首页能显示旅行信息表单、目的地灵感、生成状态和结果预览占位。
    - 点击随机推荐项能回填 `destination`。
    - 合法提交会调用 `POST /api/travel-plans/generate` 并进入成功状态。
    - 成功后能展示基础结果预览、免责声明和 `userVerifyItems`。
    - 修复后使用生产构建临时端口 `http://localhost:3100` 复验：当前标签未出现 `localhost:3100` hydration mismatch，推荐项可回填，mock 生成流程可成功显示基础预览。
- 第 3 轮验证结果：
  - `npm run lint` 已通过。
  - `npm run build` 已通过。
  - `npx tsc --noEmit` 已通过。
- 使用生产构建启动本地服务后手动验证：
  - 合法 `POST /api/travel-plans/generate` 请求返回 HTTP 200。
  - 成功响应外层为 `{ ok: true, data: TripPlan }`。
  - 返回的 `TripPlan.input.destination` 与请求一致。
  - 返回的 `TripPlan.input.days` 与 `dailyItinerary.length` 一致。
  - `endDate < startDate` 的非法请求返回 HTTP 400、`BAD_REQUEST` 和 `requestId`。
- `mockTripPlan` 已通过 `TripPlanSchema.parse(...)` 校验。

## 下一步建议

下一轮建议实现复制全文和 Markdown 下载，基于当前 `TripPlanResult` 展示口径复用同一份 `TripPlan` 数据；真实 AI、数据库、登录、地图、天气、搜索增强、PDF 导出和版本历史仍建议继续后置。
