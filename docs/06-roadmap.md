# AI 旅行计划生成与管理网站 - Roadmap

## 关键假设

- Roadmap 以 MVP 闭环优先，不让后续扩展阻塞第一版发布。
- 第一版不使用数据库、不登录、不保存历史。
- 先 mock 数据打通 schema、API、UI、Markdown，再接真实 AI Provider。
- 涉及第三方 AI、搜索、地图、天气 API 时，实现前必须查官方文档确认接口能力、价格、额度和合规要求。

## MVP 范围

MVP 完成一个从输入到结构化旅行计划展示的闭环：

```txt
TripGenerationRequest
  -> POST /api/travel-plans/generate
  -> AIProvider
  -> TripPlanSchema
  -> TripGenerationResponse
  -> TripPlanView
  -> Copy / Markdown Download / Browser Print
```

## 非 MVP 范围

以下功能不进入 MVP 阶段验收：

- 登录、数据库、历史记录、版本回滚。
- 服务端 PDF 导出或精确排版 PDF；MVP 仅支持浏览器打印/保存 PDF。
- 真实酒店价格、真实门票价格、票务预订。
- 复杂地图展示、实时路线规划。
- 实时天气。
- 真实联网搜索。
- 多 AI Provider UI。

## 后续扩展

后续扩展按产品验证结果选择，不默认进入第一版：

- 网络参考增强模式。
- 地图和路线 API。
- 天气 API。
- 方案对比。
- AI 评分和行程优化。
- 旅行文案。
- 保存历史和版本回滚。
- 多 AI Provider。

## 阶段 0：文档与项目骨架

目标：

- 明确产品边界、技术架构、数据契约、Prompt 策略和实现顺序。
- 初始化 Next.js + TypeScript + Tailwind CSS 项目骨架。

主要任务：

- 创建 `docs/01-product-plan.md` 到 `docs/07-implementation-tasks.md`。
- 初始化项目结构。
- 建立基础目录：`src/app`、`src/components/trip`、`src/lib/ai`、`src/lib/schemas`、`src/lib/services`、`src/lib/markdown`。

验收标准：

- 7 份文档存在且字段、接口、类型命名一致。
- 项目能启动默认 Next.js 页面。
- 未安装无关依赖，未接真实第三方 API。

## 阶段 1：Schema 与 Mock 闭环

目标：

- 用 mock provider 打通请求、校验、响应、展示前的数据合同。

主要任务：

- 创建 `TripGenerationRequestSchema`、`TripPlanSchema`、`TripGenerationResponseSchema`。
- 创建 mock JSON。
- 创建 `mock-provider.ts`。
- 创建 `trip-generation-service.ts`。
- 实现 `POST /api/travel-plans/generate` mock 返回。

验收标准：

- 合法请求返回 `TripGenerationResponse`。
- mock `TripPlan` 通过 `TripPlanSchema`。
- 非法请求返回 `400 INVALID_REQUEST`。
- mock 数据包含 `verificationItems`、`disclaimer` 和多个 `needVerify: true` 条目。

## 阶段 2：前端 UI 与 Markdown

目标：

- 用户能完成表单提交、查看计划、重新生成、复制全文、下载 Markdown。

主要任务：

- 实现 `TripForm`。
- 实现随机目的地推荐。
- 实现 `TripPlanView`、`DayPlanCard`、`VerifyBadge`。
- 实现 `tripToMarkdown(tripPlan)`。
- 实现 `MarkdownActions`。
- 接入页面状态：`idle`、`loading`、`success`、`error`。

验收标准：

- 首页第一屏是工具页面。
- 表单能提交到 `POST /api/travel-plans/generate`。
- 生成中和错误状态清楚。
- 结果展示覆盖 `TripPlan` 所有 MVP 信息。
- 复制和 Markdown 下载内容包含风险提醒、自行确认事项、免责声明。

## 阶段 3：真实 AI Provider 接入

目标：

- 在服务端通过 `AIProvider` 接口接入一个主 AI 模型。

主要任务：

- 查所选 AI Provider 官方文档，确认 SDK、接口能力、模型名、鉴权方式、价格和额度。
- 实现 `primary-provider.ts`。
- 使用 `AI_PROVIDER` 在 mock 和 primary 之间切换。
- 实现 `buildTripPlanPrompt(request)`。
- 实现 JSON 解析、schema 校验和有限重试。

验收标准：

- 前端不出现任何 `AI_API_KEY`。
- `AI_PROVIDER=mock` 时仍可本地稳定开发。
- `AI_PROVIDER=primary` 且服务端环境变量配置正确时可以生成真实 AI 计划。
- AI 返回非 JSON 或 schema 错误时不会向前端返回半成品计划。

## 阶段 4：MVP 体验完善

目标：

- 提高稳定性、可读性和错误恢复体验。

主要任务：

- 优化移动端布局。
- 改善表单校验文案。
- 完善错误码映射。
- 增加基础测试。
- 检查所有易变化信息的展示提示。

验收标准：

- 主要移动和桌面宽度无布局重叠。
- Schema、API、Markdown 转换有基础测试。
- 用户可以从错误状态恢复并重新生成。
- 所有实时或易变化信息均可见地提示需自行确认。

## 阶段 5：扩展能力评估

目标：

- 在 MVP 可用后，根据真实使用反馈选择扩展方向。

候选任务：

- 网络参考增强模式。
- 保存历史。
- 方案对比。
- AI 评分。
- 地图和路线展示。
- 天气提醒。
- 更完整的导出能力，例如服务端 PDF 导出或精确排版 PDF。

验收标准：

- 每个扩展都有独立需求说明和技术评估。
- 不破坏 `POST /api/travel-plans/generate` 的 MVP 契约。
- 涉及第三方 API 的扩展必须先完成官方文档调研。
