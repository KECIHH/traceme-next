# AI 旅行计划生成与管理网站 - 技术架构

> **状态说明（第 49 轮）**：本文是历史设计/早期 MVP 参考，保留用于追溯旧规划，不再作为当前执行依据。当前事实以 `docs/00-project-brief-and-roadmap.md`、`docs/08-project-state.md`、`docs/13-next-feature-roadmap.md`、`docs/14-delete-restore-design.md` 和当前代码为准。

## 关键假设

- 新项目使用 Next.js App Router、TypeScript、Tailwind CSS。
- 运行时以服务端 API Route 调用 AI，前端不保存、不读取、不透传第三方 API Key。
- MVP 只提供一个业务 API：`POST /api/travel-plans/generate`。
- 校验统一放在 `src/lib/schemas/trip.ts`，运行时使用 Zod，TypeScript 类型从 schema 推导或与 schema 同步维护。
- Markdown 导出基于 `TripPlan` 生成，不需要后端文件存储。

## 推荐目录结构

```txt
src/
  app/
    page.tsx
    api/
      travel-plans/
        generate/
          route.ts
  components/
    trip/
      TripForm.tsx
      TripPlanView.tsx
      DayPlanCard.tsx
      VerifyBadge.tsx
      MarkdownActions.tsx
    ui/
  lib/
    ai/
      provider.ts
      mock-provider.ts
      primary-provider.ts
      prompt-builder.ts
    markdown/
      trip-to-markdown.ts
    schemas/
      trip.ts
    services/
      trip-generation-service.ts
```

## MVP 范围

MVP 架构由以下部分组成：

- 前端页面：`src/app/page.tsx` 作为首页和核心工具页。
- 旅行表单：`TripForm` 负责收集 `TripGenerationRequest`。
- 结果展示：`TripPlanView`、`DayPlanCard`、`VerifyBadge` 展示 `TripPlan`。
- Markdown 操作：`MarkdownActions` 调用 `tripToMarkdown(tripPlan)`，支持复制全文和下载 Markdown。
- API Route：`POST /api/travel-plans/generate` 处理请求、返回 `TripGenerationResponse`。
- Service：`generateTripPlan(request)` 编排 prompt、AI Provider、JSON 解析、schema 校验和错误处理。
- AI Provider：通过 `AIProvider` 接口隔离具体模型。
- Prompt Builder：`buildTripPlanPrompt(request)` 负责生成 system prompt 和 user prompt。
- Schema 校验：`TripGenerationRequestSchema`、`TripPlanSchema`、`TripGenerationResponseSchema`。

## 非 MVP 范围

第一版不引入：

- 数据库 ORM、迁移脚本、持久化 schema。
- 用户鉴权中间件。
- 服务端文件存储。
- 后台任务队列。
- 实时搜索、地图、天气 API。
- 多 Provider 管理后台。
- 复杂缓存、限流、审计日志系统。

如果后续需要这些能力，应在 MVP 稳定后按 Roadmap 逐步引入。

## 后续扩展

- 增加 `SearchReferenceProvider`，为 AI 提供网络参考资料。
- 增加 `MapRouteProvider`，补充路线展示和地图链接。
- 增加 `WeatherProvider`，补充天气提醒。
- 增加数据库后，将 `TripPlan` 保存为历史记录。
- 扩展 `AIProvider`，支持多模型配置、降级和 A/B 测试。

## 职责边界

### Frontend

负责：

- 收集用户输入并组成 `TripGenerationRequest`。
- 调用 `POST /api/travel-plans/generate`。
- 展示加载、成功、错误状态。
- 展示 `TripPlan`。
- 调用 `tripToMarkdown` 完成复制和下载。

不负责：

- 调用第三方 AI API。
- 保存或读取 `AI_API_KEY`。
- 修复 AI 输出结构。
- 判断门票、天气、酒店、交通等实时信息真实性。

### API Route

`src/app/api/travel-plans/generate/route.ts` 负责：

- 只接受 `POST` 请求。
- 读取请求 JSON。
- 使用 `TripGenerationRequestSchema` 校验输入。
- 调用 `generateTripPlan(request)`。
- 返回 `TripGenerationResponse`。
- 对错误返回统一错误结构。

API Route 不直接拼 prompt，不直接写具体 AI SDK 逻辑。

### Trip Generation Service

`src/lib/services/trip-generation-service.ts` 负责：

- 调用 `buildTripPlanPrompt(request)`。
- 根据环境变量选择 `mock-provider` 或 `primary-provider`。
- 调用 `AIProvider.generateTripPlanJson(prompt)`。
- 提取并解析 JSON。
- 使用 `TripPlanSchema` 校验 AI 返回。
- 补充 `warnings` 和 `generatedAt`。
- 在 AI 返回格式错误时执行有限重试或返回可理解错误。

### AI Provider

`src/lib/ai/provider.ts` 定义最小抽象：

```ts
export interface AIProvider {
  generateTripPlanJson(input: GenerateTripPlanInput): Promise<string>;
}

export interface GenerateTripPlanInput {
  systemPrompt: string;
  userPrompt: string;
}
```

`mock-provider.ts` 返回固定 JSON 字符串，用于本地 UI 和 schema 闭环。

`primary-provider.ts` 调用一个真实主模型。具体 SDK、模型名、价格、额度、接口能力必须在实现前查官方文档确认，不在文档中虚构。

### Prompt Builder

`src/lib/ai/prompt-builder.ts` 负责：

- 将 `TripGenerationRequest` 转成 AI 可理解的输入。
- 要求 AI 只返回 JSON。
- 明确禁止把实时变化信息写成确定事实。
- 要求所有易变化信息设置 `needVerify: true` 或加入 `verificationItems`。
- 要求输出字段与 `TripPlan` 完全匹配。

### Schema Validation

`src/lib/schemas/trip.ts` 负责：

- 定义 `TripGenerationRequestSchema`。
- 定义 `TripPlanSchema`。
- 定义 `TripGenerationResponseSchema`。
- 导出 `TripGenerationRequest`、`TripPlan`、`TripGenerationResponse` 类型。

Schema 是前后端共享契约，API Route、Service、测试、mock 数据都必须使用同一份 schema。

### Markdown Export

`src/lib/markdown/trip-to-markdown.ts` 负责：

- 将 `TripPlan` 转成 Markdown 字符串。
- 保留风险提醒、用户自行确认事项和免责声明。
- 对 `needVerify: true` 的内容添加“需自行确认”提示。
- 不保存文件，由前端创建 Blob 并触发下载。

## 请求流

```txt
TripForm
  -> POST /api/travel-plans/generate
  -> route.ts validates TripGenerationRequest
  -> generateTripPlan(request)
  -> buildTripPlanPrompt(request)
  -> AIProvider.generateTripPlanJson(prompt)
  -> parse JSON
  -> TripPlanSchema validation
  -> TripGenerationResponse
  -> TripPlanView + MarkdownActions
```

## 错误处理原则

- 输入错误返回 `400 INVALID_REQUEST`。
- AI 返回非 JSON 返回 `502 AI_INVALID_JSON`，可先有限重试一次。
- AI JSON 不符合 schema 返回 `502 AI_SCHEMA_VALIDATION_FAILED`。
- AI Provider 配置缺失返回 `500 AI_PROVIDER_NOT_CONFIGURED`。
- 未预期错误返回 `500 INTERNAL_ERROR`。

所有错误响应使用统一结构，详见 `03-data-and-api-design.md`。
