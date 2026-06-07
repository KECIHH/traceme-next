# MVP 发布检查清单

本文档用于第 14 轮 MVP 发布准备。当前发布对象仍是旅行计划草稿生成 MVP，不包含数据库、登录、地图、天气、联网搜索、PDF、版本历史、方案对比或行程优化。

## 发布前命令检查

发布前依次运行：

```bash
npm test
npm run lint
npm run build
npx tsc --noEmit
```

通过标准：

- 四条命令全部退出码为 0。
- `npm test` 覆盖核心请求 schema、结果 schema、JSON 解析、Markdown 输出和预算口径。
- `npm run build` 不依赖浏览器端密钥。
- `npx tsc --noEmit` 无类型错误。

## Mock 模式验收

本地或临时服务使用：

```env
AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=
AI_CHAT_COMPLETIONS_URL=
AI_REQUEST_TIMEOUT_MS=
```

验收项：

- 首页可打开并提交合法表单。
- `POST /api/travel-plans/generate` 返回 HTTP 200、`ok: true`。
- 响应中 `source.provider=mock`、`source.kind=mock`。
- `input.days` 与 `dailyItinerary.length` 一致。
- `userVerifyItems` 覆盖门票/预约、营业时间、酒店价格、交通班次/价格、天气五类。
- 页面展示“已生成草稿”、完整结果区、用户自行确认事项和免责声明。
- 复制全文和下载 Markdown 入口可见。

## OpenAI-Compatible 真实模式验收

真实模式只在服务端配置环境变量：

```env
AI_PROVIDER=openai-compatible
AI_API_KEY=
AI_MODEL=
AI_CHAT_COMPLETIONS_URL=
AI_REQUEST_TIMEOUT_MS=
```

验收项：

- 使用真实服务端环境变量启动生产构建服务。
- 合法请求返回 HTTP 200、`ok: true`。
- 响应中 `source.provider=openai-compatible`、`source.kind=ai`。
- `input.days` 与 `dailyItinerary.length` 一致。
- `userVerifyItems` 覆盖五类用户需自行确认事项。
- 页面可展示 AI 草稿结果、复制全文和下载 Markdown 入口。
- 响应、页面和日志摘要不暴露 API Key、Authorization header、Bearer token、完整 provider URL、完整 prompt 或原始 provider 响应。
- 文案继续提示旅行计划是草稿，实时或易变信息需用户自行确认。

## 缺配置错误路径验收

在临时进程中设置 `AI_PROVIDER=openai-compatible`，并保持 `AI_API_KEY`、`AI_MODEL`、`AI_CHAT_COMPLETIONS_URL` 为空。

验收项：

- 合法业务请求返回 HTTP 500。
- 响应为 `ok: false`。
- `error.code=AI_PROVIDER_CONFIG_ERROR`。
- 响应包含 `requestId`。
- 前端展示用户友好的服务端 AI 配置不可用提示。
- 响应和页面不暴露密钥、Authorization header、Bearer token、完整 URL、api-key 字样或堆栈。

## 密钥泄露检查

发布前检查：

```bash
git status --short
git check-ignore -v .env.local .next node_modules
rg -n "sk-[A-Za-z0-9]|Bearer\\s+|Authorization\\s*:|NEXT_PUBLIC_AI_API_KEY" README.md docs src tests .env.local.example
```

通过标准：

- `.env.local`、`.next`、`node_modules` 被 `.gitignore` 覆盖。
- `.env.local.example` 只包含变量名和空值示例。
- README、docs、源码和测试中没有真实 API Key。
- 前端代码不读取或暴露 `AI_API_KEY`，也没有 `NEXT_PUBLIC_AI_API_KEY`。
- 如果扫描命中安全说明文字或服务端 provider 中的 `Authorization` header 构造，需要人工复核确认没有真实密钥值。

不要把 `.env.local` 内容复制到 README、docs、源码、测试或 issue/PR 描述中。

## 当前工作区改动归属

第 14 轮开始时的状态：

- Staged：`docs/08-project-state.md`、`package-lock.json`、`package.json`、`tests/core-contracts.test.ts`，归属第 13 轮测试、脚本和项目状态记录。
- Unstaged：`src/components/trip/result-actions.tsx`、`src/components/trip/trip-planner-form.tsx`、`src/lib/ai/build-trip-plan-prompt.ts`、`src/lib/ai/openai-compatible-provider.ts`、`src/lib/services/generate-trip-plan.ts`，归属历史功能、provider、prompt、UI 和生成链路改动，不归属第 14 轮发布文档准备。
- Untracked：第 14 轮开始时无 untracked 文件。

第 14 轮本身只应新增或修改发布说明、发布检查清单、环境变量示例和项目状态记录，不应修改核心业务逻辑。

## 部署环境变量清单

mock 部署或演示：

- `AI_PROVIDER=mock`
- `AI_API_KEY` 留空
- `AI_MODEL` 留空
- `AI_CHAT_COMPLETIONS_URL` 留空
- `AI_REQUEST_TIMEOUT_MS` 留空或正整数

真实 AI 部署：

- `AI_PROVIDER=openai-compatible`
- `AI_API_KEY`：必填，只配置在服务端。
- `AI_MODEL`：必填。
- `AI_CHAT_COMPLETIONS_URL`：必填。
- `AI_REQUEST_TIMEOUT_MS`：可选，留空时使用服务端默认值。

## 已知限制

- 当前生成结果是规划草稿，不是实时事实源。
- 没有数据库和用户系统，结果不会保存到账户。
- 没有地图、天气、联网搜索、真实票价、酒店价格、门票和交通班次查询。
- 没有 PDF 导出、版本历史、保存历史、方案对比和行程优化。
- `openai-compatible` 仅覆盖兼容 Chat Completions 或 Responses 的 provider 形态。
- in-app Browser 可能无法验证实际下载落盘，只能验证页面反馈和下载触发。
