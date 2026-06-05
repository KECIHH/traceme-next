# 项目状态记录 - MVP 编码阶段第 9 轮

## 第 9 轮已完成

- 已修复 mock 目的地串戏风险：
  - `src/lib/ai/mock-provider.ts` 继续使用按用户 `destination` 动态生成的通用旅行草稿模板。
  - 当用户选择厦门等非成都目的地时，mock API 返回的行程、景点、餐饮、住宿、交通内容会跟随用户目的地，不展示成都专属景点或街区。
  - `src/lib/mock/mock-trip-plan.ts` 已从旧的“上海出发成都 5 天 4 晚”fixture 改为通用目的地 fixture，避免后续复用项目自有 mock 文件时再次引入成都串戏。
- 已修复预算口径展示与生成口径：
  - `budget.scope` 继续作为正式请求契约，取值为 `total` 或 `perPerson`。
  - `src/lib/utils/budget.ts` 的 `getBudgetSummary(...)` 统一计算用户填写金额、总预算参考和人均预算参考。
  - `src/components/trip/trip-plan-result.tsx` 和 `src/lib/markdown/format-trip-plan-markdown.ts` 均展示用户填写口径、总预算参考和人均预算参考。
  - `src/lib/ai/mock-provider.ts` 的 `budgetBreakdown` 按整趟旅行总预算估算：`total` 直接使用 `budget.amount`，`perPerson` 使用 `budget.amount * travelers`。
- 已修复 mock / 真实 AI 文案区分：
  - `TripPlan.source` 当前包含 `provider` 和 `kind`。
  - `AI_PROVIDER=mock` 时返回 `source: { provider: "mock", kind: "mock" }`。
  - `AI_PROVIDER=openai-compatible` 时服务端覆盖为 `source: { provider: "openai-compatible", kind: "ai" }`。
  - 页面来源标签按 `source` 显示为“本地 mock / mock 草稿”或“OpenAI-compatible / AI 草稿”。
  - Markdown 顶部说明按 `source.kind` 输出 mock 草稿或 AI 草稿，不在真实 AI 模式固定写“mock 生成”。
- 已增加明确的重新生成入口：
  - 页面保存最近一次通过前端校验并提交的 `GenerateTripPlanRequest`。
  - 状态卡展示“重新生成 / 再来一版”按钮。
  - 点击后复用最近一次有效请求再次调用 `POST /api/travel-plans/generate`。
  - loading 时按钮禁用；失败后仍保留最近请求，方便用户直接重试。
- 本轮新增或修改文件：
  - `src/app/page.tsx`
  - `src/lib/mock/mock-trip-plan.ts`
  - `docs/08-project-state.md`
- 当前仍未实现：
  - 真实 AI 成功调用验证
  - 非 Chat Completions 兼容格式的第三方 Provider
  - 用户登录
  - 数据库
  - 地图
  - 天气
  - 搜索增强
  - PDF 导出
  - 版本历史
  - 保存到笔记
  - 真实票价、酒店价格、门票、交通班次、天气等实时数据能力

## 第 9 轮验证结果

- 静态检查已通过：
  - `npm run lint` 已通过。
  - `npx tsc --noEmit` 已通过。
  - `npm run build` 已通过。
- Mock API 验证已通过：
  - 使用生产构建临时服务 `http://127.0.0.1:3132`。
  - 提交目的地为“厦门”的合法请求返回 HTTP 200、`ok: true`。
  - 成功响应中 `data.input.destination` 为“厦门”，`overview` 包含“厦门”。
  - 成功响应中 `source.provider` 为 `mock`，`source.kind` 为 `mock`。
  - 成功响应中 `data.input.days` 为 5，`dailyItinerary.length` 为 5。
  - 成功响应未出现宽窄巷子、熊猫基地、武侯祠、锦里、杜甫草堂、春熙路、太古里、人民公园、奎星楼街、建设路、青羊宫、文殊院、浣花溪等成都专属词。
- 预算口径 API 验证已通过：
  - `budget.scope="total"`、`budget.amount=8000`、`travelers=2` 时，mock `budgetBreakdown` 合计为 8000。
  - `budget.scope="perPerson"`、`budget.amount=4000`、`travelers=2` 时，mock `budgetBreakdown` 合计为 8000。
  - 页面和 Markdown 使用同一套 `getBudgetSummary(...)` 口径展示用户填写预算、总预算参考和人均预算参考。
- `AI_PROVIDER=openai-compatible` 缺配置错误路径验证已通过：
  - 使用生产构建临时服务 `http://127.0.0.1:3133`。
  - 未配置 `AI_API_KEY`、`AI_MODEL`、`AI_CHAT_COMPLETIONS_URL` 时，合法业务请求返回 HTTP 500。
  - 错误响应为 `{ ok: false, error: { code: "AI_PROVIDER_CONFIG_ERROR", message, requestId } }`。
  - 错误响应未暴露 API Key、Authorization header、Bearer、堆栈等敏感文本。
- 浏览器主流程验证已通过：
  - 使用生产构建临时服务 `http://127.0.0.1:3134`。
  - 首页可打开，目的地输入改为“厦门”后可提交。
  - 成功后进入 `已生成草稿`，结果页展示“厦门”、`本地 mock`、`mock 草稿`、总预算参考 `¥8,000` 和人均预算参考 `¥4,000`。
  - 页面未出现成都专属景点或街区词。
  - “重新生成 / 再来一版”按钮可见。
  - 点击后可再次生成，页面仍显示成功状态，最近请求保持为“上海 到 厦门”。
- 静态边界扫描已通过：
  - 未发现 `NEXT_PUBLIC_AI_API_KEY`。
  - 未新增 `localStorage`、`sessionStorage`、`indexedDB`、`prisma`、`supabase`、`auth` 等登录、数据库或历史记录实现迹象。
  - 未新增地图、天气、PDF、搜索增强等非当前阶段能力。
- 真实 AI 成功调用未验证：
  - 当前未提供真实 `AI_API_KEY`、`AI_MODEL` 和 `AI_CHAT_COMPLETIONS_URL`。
  - 本轮不假装真实 AI 已调用成功。

## 记录时间

- 日期：2026-06-06
- 阶段：MVP 编码阶段第 9 轮

## 第 8 轮已完成

- 已新增服务端 AI Provider 切换能力：
  - 当前支持 `AI_PROVIDER=mock` 和 `AI_PROVIDER=openai-compatible`。
  - `AI_PROVIDER` 缺失时默认使用 `mock`，方便本地开发在没有 API Key 时继续运行。
  - `AI_PROVIDER=openai-compatible` 时必须配置 `AI_API_KEY`、`AI_MODEL`、`AI_CHAT_COMPLETIONS_URL`。
  - `AI_REQUEST_TIMEOUT_MS` 可选，默认建议值和示例值为 `60000`。
  - 如果 `openai-compatible` 缺少必要环境变量，服务端返回 `AI_PROVIDER_CONFIG_ERROR`，不会静默 fallback 到 mock。
- 已保留 mock provider：
  - `AI_PROVIDER=mock` 时仍使用现有 mock 旅行计划数据生成 JSON 字符串。
  - 表单、推荐目的地、mock API、完整结果展示、复制全文和下载 Markdown 仍应继续可用。
- 已新增 OpenAI-compatible adapter：
  - 仅适用于兼容 Chat Completions 请求/响应格式的服务。
  - 请求体使用 `model` 和 `messages`。
  - 响应读取 `choices[0].message.content` 作为 raw text。
  - provider 失败时会记录有限服务端诊断信息，只包含错误类别、模型名、URL host 和状态码等安全字段。
  - 诊断信息不会记录 API Key、Authorization header、完整响应、完整 prompt 或用户界面可见堆栈。
  - 实际 `AI_CHAT_COMPLETIONS_URL` 和 `AI_MODEL` 需要用户按所选 AI 服务官方文档配置。
  - 如果所选服务不是 Chat Completions 兼容格式，后续需要新增对应 Provider。
- 已新增 Prompt Builder：
  - Prompt 明确 AI 是旅行计划草稿助手。
  - Prompt 明确禁止声称查询了实时票务、酒店、天气、地图、交通、官网或联网搜索。
  - Prompt 要求不要编造准确门票、营业时间、酒店价格、交通班次、实时天气、预约状态、交通耗时或交通价格。
  - Prompt 要求易变信息必须设置 `needVerify: true`、写 `verifyNote`，并覆盖到 `userVerifyItems`。
  - Prompt 要求预算只能作为估算参考。
  - Prompt 要求只输出合法 JSON，不输出 Markdown、代码块或 JSON 以外解释文字。
  - Prompt 要求 `dailyItinerary` 天数等于用户输入日期计算出的天数。
  - Prompt 要求必须包含 `disclaimer` 和 `userVerifyItems`。
- 已更新 AI 输出处理：
  - provider 只返回 raw text。
  - 服务端继续负责 JSON 解析和 `TripPlanSchema` 校验。
  - 服务端强制覆盖 `id`、`generatedAt`、`generationMode` 和 `input`，避免 AI 改写用户输入或决定服务端元信息。
  - 最终返回给前端的仍必须通过 `TripPlanSchema`。
- 已增强 JSON 解析：
  - 优先支持标准 JSON 字符串。
  - 支持提取第一个 Markdown JSON 代码块中的 JSON。
  - 解析失败返回 `AI_JSON_PARSE_ERROR`。
  - 当前不做复杂自动修复，也不猜测补全业务字段。
- 已更新错误码：
  - `BAD_REQUEST`
  - `AI_PROVIDER_CONFIG_ERROR`
  - `AI_PROVIDER_ERROR`
  - `AI_EMPTY_RESPONSE`
  - `AI_JSON_PARSE_ERROR`
  - `AI_SCHEMA_VALIDATION_ERROR`
  - `INTERNAL_ERROR`
- 已新增 `.env.local.example`：
  - 只包含变量名和空值示例，不包含真实密钥。
  - `AI_API_KEY` 只用于服务端。
  - 没有使用 `NEXT_PUBLIC_` 前缀保存 AI 密钥。
- 本轮新增或修改文件：
  - `.gitignore`
  - `.env.local.example`
  - `src/lib/ai/ai-provider.ts`
  - `src/lib/ai/build-trip-plan-prompt.ts`
  - `src/lib/ai/get-ai-provider.ts`
  - `src/lib/ai/mock-provider.ts`
  - `src/lib/ai/openai-compatible-provider.ts`
  - `src/lib/ai/parse-ai-json.ts`
  - `src/lib/services/generate-trip-plan.ts`
  - `src/lib/services/travel-plan-client.ts`
  - `src/app/api/travel-plans/generate/route.ts`
  - `docs/08-project-state.md`
- 当前仍未实现：
  - 数据库
  - 登录
  - 地图
  - 天气
  - 联网搜索
  - PDF 导出
  - 版本历史
  - 保存到笔记
  - 真实票价、酒店价格、门票、交通班次、天气等实时数据能力
  - 方案对比
  - 行程优化
- 真实 AI 调用验证状态：
  - 当前未提供真实 `AI_API_KEY`、`AI_MODEL` 和 `AI_CHAT_COMPLETIONS_URL`。
  - 因此本轮不能假装已完成真实 AI 成功调用验证。
  - 当前可以验证的是 mock 模式和 `openai-compatible` 缺配置时的服务端配置错误路径。

## 记录时间

- 日期：2026-06-05
- 阶段：MVP 编码阶段第 8 轮

## 第 8 轮验证结果

- `npm run lint` 已通过。
- `npm run build` 已通过。
- `npx tsc --noEmit` 已通过。
- `AI_PROVIDER=mock` API 验证已通过：
  - 使用生产构建临时服务 `http://127.0.0.1:3108`。
  - 合法 `POST /api/travel-plans/generate` 返回 HTTP 200、`ok: true`。
  - 成功响应中 `data.input.days` 为 5，`dailyItinerary.length` 为 5。
  - 成功响应中 `userVerifyItems.length` 为 5。
  - 成功响应中 `generationMode` 为 `quick`。
- `AI_PROVIDER=openai-compatible` 缺配置错误验证已通过：
  - 使用生产构建临时服务 `http://127.0.0.1:3109`。
  - 未配置 `AI_API_KEY`、`AI_MODEL`、`AI_CHAT_COMPLETIONS_URL` 时，合法业务请求返回 HTTP 500。
  - 错误响应为 `{ ok: false, error: { code: "AI_PROVIDER_CONFIG_ERROR", message, requestId } }`。
  - 错误响应未暴露 API Key、堆栈或供应商敏感信息。
- 浏览器主流程验证已通过：
  - 使用生产构建临时服务 `http://127.0.0.1:3110`。
  - 首页可打开，表单、目的地推荐和 mock 状态文案可见。
  - 点击目的地推荐可回填 `destination`。
  - 表单提交后进入 `已生成草稿` 状态。
  - 完整结果、mock 免责声明、每日行程、用户自行确认事项、免责声明、复制全文和下载 Markdown 入口可见。
  - 点击复制全文后显示“已复制 Markdown 全文。”，剪贴板 Markdown 包含每日行程、用户自行确认事项和免责声明，且未出现 `undefined`。
- 真实 AI 成功调用未验证：
  - 当前未提供真实 `AI_API_KEY`、`AI_MODEL` 和 `AI_CHAT_COMPLETIONS_URL`。
  - 本轮不假装真实 AI 已调用成功。

## 第 8 轮审查后修复

- 已修复审查提出的文档状态问题：
  - `docs/08-project-state.md` 末尾“下一步建议”已从“进入真实 AI Provider 阶段”更新为“使用真实 `.env.local` 配置验证 `AI_PROVIDER=openai-compatible` 端到端生成流程”。
  - 当前文档不再把第 8 轮之后的下一阶段误写为“开始接入真实 AI Provider”。
- 已优化 `openai-compatible` provider 的服务端安全诊断：
  - 非 2xx、响应非 JSON、空 `choices[0].message.content`、超时或请求异常时，会记录有限服务端诊断。
  - 诊断仅包含错误类别、模型名、URL host、HTTP 状态码等安全字段。
  - 诊断不记录 API Key、Authorization header、完整响应、完整 prompt 或用户界面可见堆栈。
- 审查后修复验证结果：
  - `npm run lint` 已通过。
  - `npm run build` 已通过。
  - `npx tsc --noEmit` 已通过。
  - `AI_PROVIDER=mock` 复验已通过：合法 `POST /api/travel-plans/generate` 返回 HTTP 200、`ok: true`。
  - `AI_PROVIDER=openai-compatible` 缺配置复验已通过：未配置必要环境变量时返回 HTTP 500 和 `AI_PROVIDER_CONFIG_ERROR`，未 fallback 到 mock。
  - 当前仍未提供真实 `AI_API_KEY`、`AI_MODEL` 和 `AI_CHAT_COMPLETIONS_URL`，因此未验证真实 AI 成功调用。

## 第 8 轮最终验收后修复

- 已修复最终验收发现的复制全文失败问题：
  - `src/components/trip/result-actions.tsx` 的复制逻辑保留 `navigator.clipboard.writeText` 优先路径。
  - 当现代 Clipboard API 因浏览器权限或运行环境限制失败时，自动使用隐藏 `textarea` 和 `document.execCommand("copy")` 作为 fallback。
  - 复制内容仍来自同一份 `formatTripPlanMarkdown(tripPlan)`，不改变 Markdown 内容来源。
- 最终验收后修复验证结果：
  - `AI_PROVIDER=mock` API 复验已通过：合法 `POST /api/travel-plans/generate` 返回 HTTP 200、`ok: true`，`dailyItinerary.length` 为 5，`userVerifyItems.length` 为 5。
  - `AI_PROVIDER=mock` 浏览器主流程复验已通过：页面可提交默认表单，成功后展示完整结果、mock 文案、每日行程、用户自行确认事项、免责声明、复制全文和下载 Markdown。
  - 复制全文复验已通过：点击后显示“已复制 Markdown 全文。”，浏览器剪贴板 Markdown 包含每日行程、用户自行确认事项和免责声明，且未出现 `undefined` 或 `null`。
  - 下载 Markdown 复验已通过：点击后显示“已开始下载 Markdown 文件。”；当前只验证浏览器反馈和 Blob 下载触发，未打开落盘后的 `.md` 文件。
  - `AI_PROVIDER=openai-compatible` 缺配置错误路径复验已通过：缺少 `AI_API_KEY`、`AI_MODEL` 和 `AI_CHAT_COMPLETIONS_URL` 时，合法业务请求返回 HTTP 500 和 `AI_PROVIDER_CONFIG_ERROR`，未 fallback 到 mock，错误响应未暴露密钥、Authorization header 或堆栈。
  - 当前仍未提供真实 `AI_API_KEY`、`AI_MODEL` 和 `AI_CHAT_COMPLETIONS_URL`，因此未验证真实 AI 成功调用。
  - 修复后静态检查已通过：`npm run lint`、`npm run build` 和 `npx tsc --noEmit` 均已通过。

## 第 7 轮已完成

- 已完成 Mock MVP 总体验收和小修补：
  - 修复 `src/app/page.tsx` 的过期空状态文案。
  - 第 6 轮遗留的“复制/下载留待后续”说法已改为当前真实状态：生成计划后可查看完整行程，并复制全文或下载 Markdown。
  - 未接入真实 AI API，未新增数据库、登录、地图、天气、搜索增强、PDF 导出、版本历史或保存到笔记能力。
  - 未修改 `docs/01-product-plan.md` 到 `docs/07-implementation-tasks.md`。
- 已完成一致性检查：
  - 未发现旧 trips generate 业务路径。
  - 当前前端调用路径仍为 `/api/travel-plans/generate`。
  - 当前唯一业务 API 仍为 `POST /api/travel-plans/generate`。
  - 未发现“复制/Markdown 下载未实现”类过期实现文案。
  - 未发现 `NEXT_PUBLIC_AI_API_KEY`。
  - 前端仍不读取或暴露 `AI_API_KEY`。
  - 当前 mock 文案仍明确说明是 mock 旅行计划草稿，没有把当前生成能力说成真实 AI。
- 当前 mock MVP 已完成能力：
  - 首页表单填写。
  - 本地静态目的地推荐与回填。
  - `POST /api/travel-plans/generate` mock API 闭环。
  - loading、success、error 状态。
  - 完整 `TripPlanResult` 展示。
  - 免责声明和用户自行确认事项展示。
  - 复制全文。
  - 下载 Markdown 按钮与 Blob 下载实现。
  - 复制和下载复用 `formatTripPlanMarkdown(tripPlan)`。
- 本轮新增或修改文件：
  - `src/app/page.tsx`
  - `docs/08-project-state.md`
- 当前仍然使用 mock API：
  - 当前生成链路仍为 mock provider，不是真实 AI。
  - 本轮仍未接入真实 AI API。
  - API route、schema 和前端 client 契约未改变。

## 第 7 轮审查后修复

- 已修复审查发现的 mock/AI 表述问题：
  - `src/lib/markdown/format-trip-plan-markdown.ts` 的 Markdown 顶部说明已改为“mock 生成的旅行规划参考草稿”。
  - `src/lib/mock/mock-trip-plan.ts` 的免责声明已改为“本旅行计划由 mock 生成”。
  - 当前 mock 结果和 Markdown 导出不再把 mock 版本描述成真实 AI。
- 已软化不适合当前产品定位的承诺式表述：
  - `src/lib/mock/mock-trip-plan.ts` 中返程日交通衔接文案已从承诺式语气改为“优先照顾交通衔接和行李处理”。
- 已修复 `docs/08-project-state.md` 中历史段落的过期“当前”描述：
  - 第 4 轮状态改为“当时”基础预览，不再与第 7 轮完整结果展示状态冲突。
- 本次审查后修复新增或修改文件：
  - `src/lib/markdown/format-trip-plan-markdown.ts`
  - `src/lib/mock/mock-trip-plan.ts`
  - `docs/08-project-state.md`
- 当前仍然使用 mock API：
  - API 路径继续为 `POST /api/travel-plans/generate`。
  - 未接入真实 AI API。
  - 未新增数据库、登录、地图、天气、搜索增强、PDF 导出、版本历史或保存到笔记能力。
- 审查后修复验证结果：
  - 文案扫描已通过：未再发现把当前 mock 计划描述为 AI 生成的用户可见文案、旧 trips generate 业务路径、旧空状态文案或“当前基础预览”过期状态描述。
  - `docs/01-product-plan.md` 到 `docs/07-implementation-tasks.md` 未修改。
  - API 验证已通过：合法 `POST /api/travel-plans/generate` 返回 HTTP 200、`ok: true`、非空 `disclaimer` 和 5 条 `userVerifyItems`；非法请求返回 HTTP 400、`ok: false`、`BAD_REQUEST`。
  - 浏览器验证已完成主要流程：`http://127.0.0.1:3000` 首页可打开，表单可提交，目的地推荐可回填，成功后展示完整结果、mock 免责声明、用户自行确认事项、“需确认/估算参考”提示、“复制全文”和“下载 Markdown”按钮。
  - 下载 Markdown 按钮验证：点击后显示“已开始下载 Markdown 文件。”提示；in-app Browser 仍不支持下载落盘检查，因此未打开本地 `.md` 文件。
  - 复制全文按钮验证：按钮可见且代码仍复用 `formatTripPlanMarkdown(tripPlan)`；当前 in-app Browser 缺少虚拟剪贴板，点击后触发复制失败提示，因此本轮未能在该浏览器环境中验证剪贴板写入成功。
  - 代码质量检查已通过：`npm run lint`、`npm run build`、`npx tsc --noEmit` 均通过。

## 第 6 轮已完成

- 已实现复制全文：
  - 新增 `src/components/trip/result-actions.tsx`。
  - 成功生成完整 `TripPlan` 后，结果顶部会显示“复制全文”按钮。
  - 点击复制时调用同一份 Markdown 格式化函数生成全文，再使用浏览器剪贴板能力写入。
  - 复制成功和失败都会显示面向用户的短提示，不暴露底层异常堆栈。
- 已实现下载 Markdown：
  - 同一操作组件内提供“下载 Markdown”按钮。
  - 下载内容来自同一份 Markdown 格式化函数。
  - 使用 `Blob` 和浏览器下载能力生成 `.md` 文件。
  - 文件名规则为 `{destination}-旅行计划-{startDate}.md`，并对目的地中的非法文件名字符和控制字符做简单安全处理。
  - 如果目的地清理后为空，文件名回退为 `旅行计划-{startDate}.md`。
- 已实现 Markdown 格式化函数：
  - 文件位置：`src/lib/markdown/format-trip-plan-markdown.ts`。
  - 导出函数：`formatTripPlanMarkdown(plan: TripPlan): string`。
  - 当前按实际 `TripPlanSchema` 输出，不修改 schema。
  - Markdown 覆盖标题、生成时间、基本信息、旅行总览、每日行程、景区安排、餐饮建议、住宿建议、交通方案、预算拆分、准备清单、风险提醒、用户自行确认事项和免责声明。
  - `needVerify: true` 的内容会在 Markdown 中标记“需确认”，并保留 `verifyNote`。
  - 预算、门票、营业时间、酒店价格、交通耗时、交通费用等内容继续使用“估算参考 / 需确认 / 仅供规划参考”语气。
  - optional 字段和空数组会安全处理，不输出 `undefined` 或 `null`。
- 已接入 `src/components/trip/trip-plan-result.tsx`：
  - `TripPlanResult` 顶部完整结果卡片后展示导出操作区。
  - 不改变 `idle`、`loading`、`error`、`success` 状态逻辑。
  - 不把原始 JSON 作为主要展示内容，开发用 JSON 仍保留在底部折叠区域。
- 本轮新增或修改文件：
  - `src/lib/markdown/format-trip-plan-markdown.ts`
  - `src/components/trip/result-actions.tsx`
  - `src/components/trip/trip-plan-result.tsx`
  - `docs/08-project-state.md`
- 当前仍然使用 mock API：
  - API 路径继续为 `POST /api/travel-plans/generate`。
  - 当前生成链路仍为 mock provider，不是真实 AI。
  - 本轮未接入真实 AI API，未新增 API route，未修改 `TripPlanSchema`。

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
- 第 4 轮页面状态当时支持：
  - `idle`
  - `loading`
  - `success`
  - `error`
- 第 4 轮成功后只展示基础结果预览：
  - 计划标题
  - 目的地
  - 天数
  - 旅行风格
  - 摘要
  - `disclaimer`
  - `userVerifyItems`
  - 开发用 JSON 折叠预览
- 第 4 轮结果展示仍然是基础预览，不是完整结果页；第 5 轮后已升级为完整结果展示。

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
  - 第 3 轮当时示例内容为成都专属 mock；第 9 轮已替换为通用目的地 fixture。
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
  - `budget.amount`
  - `budget.currency`
  - `budget.scope`
  - `preferences`
  - `customPreference`
  - `pace`
  - `generationMode`
- `budget.scope` 当前为正式请求契约，取值：
  - `total`：`budget.amount` 表示整趟总预算。
  - `perPerson`：`budget.amount` 表示单人人均预算。
- 结果页和 Markdown 使用 `getBudgetSummary(...)` 同时展示用户填写口径、总预算参考和人均预算参考。
- `generationMode` 在 MVP 当前阶段只允许 `quick`。
- `referenceEnhanced` 仅作为后续规划，本轮没有开放真实能力，也没有进入当前枚举。
- `TripPlan` 当前使用：
  - `id`
  - `generatedAt`
  - `generationMode`
  - `source`
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
- `budget.scope` 必须为 `total` 或 `perPerson`，缺失时 schema 默认按 `total` 处理。
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

- `src/lib/ai/mock-provider.ts` 当前按用户请求动态生成通用目的地 mock 旅行计划：
  - 目的地相关行程、景点、餐饮、住宿、交通文案跟随用户 `destination`。
  - `dailyItinerary.length` 跟随用户输入日期计算出的 `input.days`。
  - `budgetBreakdown` 按整趟总预算估算，兼容 `budget.scope=total` 和 `budget.scope=perPerson`。
- `src/lib/mock/mock-trip-plan.ts` 当前保留一份通用目的地 fixture，并通过 `TripPlanSchema.parse(...)` 校验：
  - 3 天每日行程
  - 景点建议
  - 餐饮建议
  - 住宿建议
  - 交通建议
  - 预算拆分
  - 打包清单
  - 风险提醒
  - 用户自行确认事项
  - 免责声明
- mock 数据没有把门票、营业时间、酒店价格、实时天气、交通班次、交通价格或交通耗时包装成确定事实。
- 相关易变内容均已标记 `needVerify: true` 或进入 `userVerifyItems`。

## API 路径状态

- 已将 `docs/01-product-plan.md` 到 `docs/07-implementation-tasks.md` 中的业务 API 路径统一为 `/api/travel-plans/generate`。
- 当前已实现唯一业务 API：`POST /api/travel-plans/generate`。
- 当前 API 返回标准外层结构：
  - 成功：`{ ok: true, data: TripPlan }`
  - 失败：`{ ok: false, error: { code, message, requestId } }`
- 当前基础错误码：
  - `BAD_REQUEST`
  - `AI_PROVIDER_CONFIG_ERROR`
  - `AI_PROVIDER_ERROR`
  - `AI_EMPTY_RESPONSE`
  - `AI_JSON_PARSE_ERROR`
  - `AI_SCHEMA_VALIDATION_ERROR`
  - `INTERNAL_ERROR`
- 当前生成链路可通过服务端 `AI_PROVIDER` 切换：
  - 缺失或 `AI_PROVIDER=mock` 时使用 mock provider。
  - `AI_PROVIDER=openai-compatible` 时使用兼容 Chat Completions 格式的 provider。
  - 真实 AI 需要用户在 `.env.local` 配置 `AI_API_KEY`、`AI_MODEL` 和 `AI_CHAT_COMPLETIONS_URL`。

## 当前仍未实现

- 真实 AI 成功调用验证
- 非 Chat Completions 兼容格式的第三方 Provider
- 用户登录
- 数据库
- 地图
- 天气
- 搜索增强
- PDF 导出
- 版本历史
- 保存到笔记
- 真实票价、酒店价格、门票、交通班次、天气等实时数据能力

## 验证结果

- 第 7 轮验证结果：
  - 一致性检查已完成：
    - 未发现旧 trips generate 业务路径。
    - 当前源码中业务请求路径仍为 `/api/travel-plans/generate`。
    - `src/app/page.tsx` 中第 6 轮遗留的“复制/下载留待后续”过期文案已清理。
    - `src/components/trip/result-actions.tsx` 中复制和下载均调用 `formatTripPlanMarkdown(tripPlan)`。
    - 未发现 `NEXT_PUBLIC_AI_API_KEY`。
    - 当前仍未接入真实 AI、数据库、登录、地图、天气、搜索增强、PDF 导出、版本历史或保存到笔记。
  - API 验证已通过：
    - 使用本地服务 `http://127.0.0.1:3000` 验证 `POST /api/travel-plans/generate`。
    - 合法请求返回 HTTP 200、`ok: true`。
    - 成功响应包含非空 `data.disclaimer`。
    - 成功响应包含 5 条 `data.userVerifyItems`。
    - 非法请求返回 HTTP 400、`ok: false`、`error.code` 为 `BAD_REQUEST`。
  - 浏览器主流程验证已完成：
    - 本轮优先尝试 `http://127.0.0.1:3100`，但当前项目已有 dev server 在 `http://127.0.0.1:3000`，实际使用 `http://127.0.0.1:3000` 完成验证。
    - 首页可打开，表单可填写。
    - 点击目的地推荐后，`destination` 输入框可回填。
    - 点击“生成旅行计划草稿”后出现 loading 状态。
    - 成功后进入 `已生成草稿` 状态，并展示完整 `TripPlanResult`。
    - 已确认每日行程、景区安排、餐饮建议、住宿建议、交通方案、预算拆分、准备清单、风险提醒、用户自行确认事项和免责声明可见。
    - 已确认“复制全文”和“下载 Markdown”按钮可见。
    - 点击“复制全文”后，浏览器剪贴板读取到 Markdown 全文，内容包含基本信息、每日行程、用户自行确认事项和免责声明，且未出现 `undefined` 或 `null`。
    - in-app Browser 不支持实际下载事件和下载落盘验证，因此本轮未能在该浏览器中打开下载后的 `.md` 文件；下载按钮可见，下载实现仍使用同一份 Markdown formatter、`Blob` 和浏览器 download 能力。
    - 已通过超长目的地提交验证 error 状态路径，页面进入 `生成失败` 并显示 `BAD_REQUEST` 对应的用户提示。
  - 代码质量检查已通过：
    - `npm run lint` 已通过。
    - `npm run build` 已通过。
    - `npx tsc --noEmit` 已通过。
- 第 6 轮验证结果：
  - `npm run lint` 已通过。
  - `npm run build` 已通过。
  - `npx tsc --noEmit` 已通过。
  - 浏览器手动验证：
    - 使用生产构建临时端口 `http://127.0.0.1:3100` 验证默认表单提交。
    - 成功后进入 `已生成草稿` 状态，并展示“复制全文”和“下载 Markdown”按钮。
    - 点击“复制全文”后，页面显示复制成功提示，浏览器剪贴板读取到 Markdown 全文。
    - 已确认复制内容包含标题、生成时间、基本信息、旅行总览、每日行程、景区安排、餐饮建议、住宿建议、交通方案、预算拆分、准备清单、风险提醒、用户自行确认事项和免责声明。
    - 已确认复制内容包含“需确认”和“估算参考”语气，且未出现 `undefined` 或 `null`。
    - in-app browser 当前不支持实际下载落盘事件，因此未能在该浏览器中打开下载后的 `.md` 文件；下载实现已使用 `Blob`、安全文件名和浏览器 download 能力完成。
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

下一轮建议使用真实 `.env.local` 配置验证 `AI_PROVIDER=openai-compatible` 的端到端生成流程，并根据实际 provider 响应微调 prompt、adapter 错误处理和安全诊断日志。后续仍需保持服务端读取密钥、前端不暴露密钥、保留 mock provider 边界、继续使用 `POST /api/travel-plans/generate`，并继续后置数据库、登录、地图、天气、搜索增强、PDF 导出、版本历史、方案对比和行程优化。
