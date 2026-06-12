# AI 旅行计划生成与管理网站 - Implementation Tasks

> **状态说明（第 49 轮）**：本文是历史设计/早期 MVP 参考，保留用于追溯旧规划，不再作为当前执行依据。当前事实以 `docs/00-project-brief-and-roadmap.md`、`docs/08-project-state.md`、`docs/13-next-feature-roadmap.md`、`docs/14-delete-restore-design.md` 和当前代码为准。

## 关键假设

- 当前仓库只有文档，后续编码 Agent 需要从项目初始化开始。
- 编码顺序必须先 mock 数据打通 UI 和 schema，再接真实 AI API。
- 不把登录、数据库、历史记录、服务端 PDF、精确排版 PDF、地图、天气、搜索作为 MVP 任务。
- 所有任务必须保持 `POST /api/travel-plans/generate`、`TripGenerationRequest`、`TripGenerationResponse`、`TripPlan` 命名一致。

## MVP 范围

这些任务完成后，MVP 应可用：

- 用户填写表单。
- 后端生成或 mock 返回 `TripPlan`。
- 后端解析和校验 AI JSON。
- 前端展示结果。
- 用户重新生成、复制全文、下载 Markdown，并可使用浏览器打印/保存 PDF。

## 非 MVP 范围

编码 Agent 不要在 MVP 任务中实现：

- 用户登录、数据库、历史记录。
- 服务端 PDF 导出或精确排版 PDF；MVP 仅支持浏览器打印/保存 PDF。
- 真实票务、酒店、天气、地图、搜索 API。
- 复杂缓存、队列、后台任务。
- 多 AI Provider 设置页面。

## 后续扩展

后续扩展任务应另开阶段，不混入 MVP PR：

- 网络参考增强。
- 地图和路线 API。
- 天气 API。
- 方案对比。
- AI 评分和优化。
- 保存历史和版本回滚。
- 多 AI Provider。

## 任务 1：初始化项目骨架

目标：

- 创建 Next.js + TypeScript + Tailwind CSS 项目。

执行：

- 初始化 Next.js App Router 项目。
- 创建或确认以下目录：

```txt
src/
  app/
  components/
    trip/
    ui/
  lib/
    ai/
    markdown/
    schemas/
    services/
```

验收：

- 项目能启动默认开发服务器。
- 未接入真实 AI API。
- 未创建数据库配置。

## 任务 2：创建共享类型与 Zod schema

目标：

- 建立全项目唯一数据契约。

执行：

- 创建 `src/lib/schemas/trip.ts`。
- 定义并导出：
  - `TripGenerationRequestSchema`
  - `TripPlanSchema`
  - `TripGenerationResponseSchema`
  - `TripGenerationRequest`
  - `TripPlan`
  - `TripGenerationResponse`
- 实现基础 refine：
  - `endDate >= startDate`
  - `travelers` 为 1 到 20
  - `budget.currency` 固定为 `CNY`
  - `budget.amount > 0`

验收：

- 合法 `TripGenerationRequest` 通过校验。
- 缺失必填字段失败。
- 合法 `TripPlan` 通过校验。
- 缺失 `verificationItems` 或 `disclaimer` 失败。

## 任务 3：创建 mock TripPlan 数据

目标：

- 在不接真实 AI 的情况下打通后端和 UI。

执行：

- 创建 `src/lib/ai/mock-provider.ts`。
- mock provider 返回 JSON 字符串。
- mock 内容覆盖：
  - `overview`
  - `dailyItinerary`
  - `attractions`
  - `diningSuggestions`
  - `accommodationSuggestions`
  - `transportation`
  - `budgetBreakdown`
  - `packingList`
  - `riskReminders`
  - `verificationItems`
  - `disclaimer`
- 涉及门票、营业时间、酒店价格、交通耗时、预算估算的条目设置 `needVerify: true`。

验收：

- mock JSON 能被 `JSON.parse`。
- mock 对象通过 `TripPlanSchema`。
- mock 中至少 5 个条目包含 `needVerify: true`。

## 任务 4：实现 AI Provider 抽象和 Trip Generation Service

目标：

- 建立后续接真实 AI 的稳定边界。

执行：

- 创建 `src/lib/ai/provider.ts`：

```ts
export interface AIProvider {
  generateTripPlanJson(input: GenerateTripPlanInput): Promise<string>;
}

export interface GenerateTripPlanInput {
  systemPrompt: string;
  userPrompt: string;
}
```

- 创建 `src/lib/services/trip-generation-service.ts`。
- 实现 `generateTripPlan(request: TripGenerationRequest): Promise<TripGenerationResponse>`。
- 在 service 中调用 provider、解析 JSON、校验 `TripPlanSchema`、补充 `warnings` 和 `generatedAt`。

验收：

- `generateTripPlan` 使用 mock provider 返回合法 `TripGenerationResponse`。
- service 不依赖 React 或浏览器 API。
- service 不直接暴露 provider API Key。

## 任务 5：实现 `POST /api/travel-plans/generate`

目标：

- 建立前后端唯一业务接口。

执行：

- 创建 `src/app/api/travel-plans/generate/route.ts`。
- 只实现 `POST`。
- 使用 `TripGenerationRequestSchema` 校验请求体。
- 调用 `generateTripPlan(request)`。
- 返回 `TripGenerationResponse`。
- 错误返回 `ApiErrorResponse`。

验收：

- 合法请求返回 `200` 和 `TripGenerationResponse`。
- 非法请求返回 `400 INVALID_REQUEST`。
- AI JSON 解析失败返回 `502 AI_INVALID_JSON`。
- AI schema 失败返回 `502 AI_SCHEMA_VALIDATION_FAILED`。

## 任务 6：实现前端表单和页面状态

目标：

- 用户可以提交生成请求并看到状态变化。

执行：

- 实现 `src/app/page.tsx`。
- 实现 `src/components/trip/TripForm.tsx`。
- 在页面维护：
  - `status`
  - `tripPlan`
  - `warnings`
  - `errorMessage`
  - 最近一次 `TripGenerationRequest`
- 实现本地随机目的地推荐。

验收：

- 首页直接展示工具表单。
- 用户提交后调用 `POST /api/travel-plans/generate`。
- loading 状态禁用提交按钮。
- error 状态保留表单输入。
- 重新生成复用最近一次请求。

## 任务 7：实现结果展示组件

目标：

- 完整展示 `TripPlan`。

执行：

- 实现：
  - `TripPlanView.tsx`
  - `DayPlanCard.tsx`
  - `VerifyBadge.tsx`
- 展示所有 MVP 结果字段。
- 对 `needVerify: true` 条目展示“需自行确认”。

验收：

- `overview`、基础信息、每日行程、景点、餐饮、住宿、交通、预算、准备清单、风险提醒、自行确认事项、免责声明全部可见。
- `needVerify: true` 有明显 UI 标记。
- 移动端不出现明显布局重叠。

## 任务 8：实现 Markdown 转换、复制和下载

目标：

- 用户可以带走生成结果。

执行：

- 创建 `src/lib/markdown/trip-to-markdown.ts`。
- 实现 `tripToMarkdown(tripPlan: TripPlan): string`。
- 实现 `MarkdownActions.tsx`。
- 支持复制全文。
- 支持下载文件名 `trip-plan-{destination}-{startDate}.md`。

验收：

- Markdown 包含 `TripPlan` 所有主要分区。
- Markdown 包含风险提醒、自行确认事项、免责声明。
- `needVerify: true` 条目在 Markdown 中标记为“需自行确认”。
- 复制和下载使用同一个 `tripToMarkdown` 输出。

## 任务 9：实现 Prompt Builder

目标：

- 为真实 AI 接入准备稳定 prompt。

执行：

- 创建 `src/lib/ai/prompt-builder.ts`。
- 实现 `buildTripPlanPrompt(request: TripGenerationRequest)`。
- 输出：
  - `systemPrompt`
  - `userPrompt`
- Prompt 明确要求：
  - 只返回 JSON。
  - 字段匹配 `TripPlan`。
  - 不编造实时信息。
  - 易变化信息设置 `needVerify: true`。
  - 必须填写 `verificationItems` 和 `disclaimer`。

验收：

- prompt 中包含用户输入。
- prompt 中包含 JSON 输出要求。
- prompt 中包含 needVerify 规则。
- prompt builder 不调用 AI、不读环境变量。

## 任务 10：接入一个主 AI Provider

目标：

- 在服务端接入真实 AI API，但不和具体模型强绑定。

执行前检查：

- 查所选 Provider 官方文档，确认 SDK、接口路径、鉴权方式、模型名、结构化输出能力、价格、额度。
- 不在代码注释或文档中虚构官方链接、价格或额度。

执行：

- 创建 `src/lib/ai/primary-provider.ts`。
- 通过 `AIProvider` 接口实现真实调用。
- 仅服务端读取：
  - `AI_PROVIDER`
  - `AI_API_KEY`
  - `AI_MODEL`
- `AI_PROVIDER=mock` 使用 mock。
- `AI_PROVIDER=primary` 使用真实 provider。

验收：

- 未配置 `AI_API_KEY` 时返回 `500 AI_PROVIDER_NOT_CONFIGURED`。
- 前端 bundle 不包含 `AI_API_KEY`。
- primary provider 返回内容仍经过 JSON 解析和 `TripPlanSchema`。

## 任务 11：完善 AI 错误处理和有限重试

目标：

- AI 输出不稳定时系统可恢复或给出清晰错误。

执行：

- 实现 `parseTripPlanJson(raw)`。
- 实现 `validateTripPlan(value)`。
- 对 `AI_INVALID_JSON` 和 `AI_SCHEMA_VALIDATION_FAILED` 最多重试 1 次。
- 重试失败后返回 `502`。
- 前端将错误码映射为用户友好文案。

验收：

- 非 JSON 返回不会导致未捕获异常。
- schema 缺字段不会返回半成品计划。
- 重试次数可控。
- 用户看到的是可理解错误文案。

## 任务 12：MVP 验收与边界检查

目标：

- 确认第一版没有偏离产品边界。

执行：

- 添加或运行基础测试：
  - schema 测试。
  - API 测试。
  - Markdown 转换测试。
  - AI 解析失败测试。
- 手动检查 UI：
  - 表单提交。
  - 重新生成。
  - 复制全文。
  - 下载 Markdown。
  - 移动端布局。
- 搜索代码确认：
  - 无 `NEXT_PUBLIC_AI_API_KEY`。
  - 前端不调用第三方 AI API。
  - 未实现数据库或登录。

验收：

- MVP 核心闭环可用。
- 所有易变化信息有 `needVerify` 或 `verificationItems`。
- 文档中标为非 MVP 的内容没有被误实现为阻塞功能。

## 建议的前 8 个编码任务

1. 初始化 Next.js + TypeScript + Tailwind CSS 项目骨架。
2. 创建共享类型与 Zod schema。
3. 创建 mock `TripPlan` JSON 并通过 schema 校验。
4. 实现 `AIProvider` 抽象和 `generateTripPlan` service。
5. 实现 `POST /api/travel-plans/generate` mock 闭环。
6. 实现 `TripForm`、页面状态和随机目的地推荐。
7. 实现 `TripPlanView`、`DayPlanCard`、`VerifyBadge`。
8. 实现 `tripToMarkdown`、复制全文和下载 Markdown。
