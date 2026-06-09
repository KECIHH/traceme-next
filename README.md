# 迹遇 Next

迹遇 Next 是一个旅行计划草稿生成 MVP。用户填写出发地、目的地、日期、人数、预算和偏好后，应用通过服务端生成一份结构化旅行计划草稿，并在页面中展示每日行程、预算参考、风险提醒、用户自行确认事项，以及 Markdown 复制/下载入口。

当前输出仅作为旅行规划草稿。门票、营业时间、酒店价格、交通班次、交通价格、天气等实时或易变信息需要用户在出行前自行核对。

## 当前 MVP 能力

- 旅行信息表单：支持出发地、目的地、日期、人数、预算口径、偏好和节奏。
- 本地目的地推荐：使用静态推荐项回填目的地，不代表实时热度或实时价格。
- 旅行计划生成：统一通过服务端 `POST /api/travel-plans/generate`。
- Provider 切换：支持 `AI_PROVIDER=mock` 和 `AI_PROVIDER=openai-compatible`。
- 结构化结果展示：包含总览、每日行程、景点、餐饮、住宿、交通、预算、准备清单、风险提醒、用户自行确认事项和免责声明。
- 导出体验：支持复制全文、下载 Markdown，以及使用浏览器打印/保存 PDF。
- 契约校验：请求和结果使用 Zod schema 校验，结果天数和用户确认事项有基础约束。
- 错误提示：前端展示用户友好的错误文案，不展示底层 provider 响应或敏感配置。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Zod
- Node.js built-in test runner + `tsx`
- ESLint

## 本地启动

安装依赖：

```bash
npm install
```

准备本地环境变量文件：

```powershell
Copy-Item .env.local.example .env.local
```

开发模式：

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

生产构建与本地启动：

```bash
npm run build
npm run start
```

## Docker Compose 部署

云服务器测试部署推荐使用 Docker Compose。服务器需要预先安装 Git、Docker 和 Docker Compose。默认使用 HTTPS 克隆公开仓库，不要求服务器配置 GitHub SSH key。

一行部署命令：

```bash
curl -fsSL https://raw.githubusercontent.com/KECIHH/traceme-next/main/scripts/deploy-docker-compose.sh | sh
```

默认部署目录为 `$HOME/traceme-next`，默认服务端口为 `3000`。如需覆盖：

```bash
curl -fsSL https://raw.githubusercontent.com/KECIHH/traceme-next/main/scripts/deploy-docker-compose.sh | TRACEME_APP_DIR=/opt/traceme-next APP_PORT=3000 sh
```

部署脚本会克隆或更新 `https://github.com/KECIHH/traceme-next.git`，执行 Docker Compose 构建和启动，并运行首页与 `POST /api/travel-plans/generate` smoke test。私有仓库或 SSH 部署可通过 `TRACEME_REPO_URL` 覆盖仓库地址。

首次部署会在服务器项目目录创建未提交的 `.env` mock 示例。真实 AI 部署时，只在服务器 `.env` 中配置以下变量名对应的服务端值：

```env
AI_PROVIDER=
AI_API_KEY=
AI_MODEL=
AI_CHAT_COMPLETIONS_URL=
AI_REQUEST_TIMEOUT_MS=
APP_PORT=
```

不要把服务器 `.env` 或本地 `.env.local` 提交到 git，也不要把真实 API Key 写入 `NEXT_PUBLIC_*` 变量。

## 测试与检查

发布前建议依次运行：

```bash
npm test
npm run lint
npm run build
npx tsc --noEmit
```

## Mock 模式

mock 模式用于本地开发、离线验收和无密钥演示。它不会调用真实 AI 服务，也不会读取 `AI_API_KEY`。

在 `.env.local` 中配置：

```env
AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=
AI_CHAT_COMPLETIONS_URL=
AI_REQUEST_TIMEOUT_MS=
```

`AI_PROVIDER` 缺失时，服务端也会默认使用 mock provider。

## OpenAI-Compatible 模式

`openai-compatible` 模式用于调用兼容 Chat Completions 或 Responses 格式的服务端 AI Provider。密钥和 endpoint 只允许放在服务端环境变量中。

需要配置：

```env
AI_PROVIDER=openai-compatible
AI_API_KEY=
AI_MODEL=
AI_CHAT_COMPLETIONS_URL=
AI_REQUEST_TIMEOUT_MS=
```

变量说明：

- `AI_PROVIDER`：`mock` 或 `openai-compatible`。
- `AI_API_KEY`：服务端使用的 AI Provider 密钥。
- `AI_MODEL`：服务端请求的模型名。
- `AI_CHAT_COMPLETIONS_URL`：兼容 Chat Completions 或 Responses 的服务端 endpoint。
- `AI_REQUEST_TIMEOUT_MS`：可选，正整数毫秒值；留空时使用服务端默认超时。

如果选择 `openai-compatible` 但缺少必要配置，接口会返回 `AI_PROVIDER_CONFIG_ERROR`，不会静默 fallback 到 mock。

本项目的 `openai-compatible` adapter 可用于 OpenAI Responses endpoint 或兼容 Chat Completions 的服务端 endpoint。[真实 AI Provider] 等兼容 OpenAI 调用形态的服务，需要将完整服务端 endpoint 填入 `AI_CHAT_COMPLETIONS_URL`。

## Database Skeleton

Round 22 adds a server-only PostgreSQL skeleton for future account history. Configure it only through the server environment variable:

```env
DATABASE_URL=
```

Leave `DATABASE_URL` empty when no PostgreSQL database is available. The current app does not expose login, saved history UI, public save/list/detail APIs, or user-usable version history yet. Do not commit `.env`, `.env.local`, real database passwords, server addresses, API keys, bearer tokens, or authorization headers.

## Auth Session Boundary

Round 23 adds a minimal server-side authentication/session boundary with Auth.js for future account history APIs. It adds the Auth.js route handler, a server-only current-user helper, and `GET /api/account/me`.

Required empty environment variable names:

```env
AUTH_SECRET=
AUTH_URL=
DATABASE_URL=
```

Optional GitHub OAuth provider variable names:

```env
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
```

Real login is enabled only when `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_GITHUB_ID`, and `AUTH_GITHUB_SECRET` are all configured in the server environment and the auth migrations have been applied. Without those values, the protected account API returns `401` and the auth provider is considered not configured. This round has not completed real provider verification.

`GET /api/account/me` returns only a non-sensitive user summary: `id`, `email`, `name`, and `image`. It must not return provider tokens, session tokens, OAuth secrets, password hashes, API keys, bearer tokens, authorization headers, raw provider responses, or database connection strings.

This round still does not expose saved history UI, version history UI, management UI, or unauthenticated save/list/detail APIs.

## Real Auth Acceptance

Round 24 adds safe local acceptance commands for the real PostgreSQL and OAuth boundary. These commands load server-only environment variables from the process environment or ignored local env files, but they print only presence checks, table names, row counts, and field-presence summaries.

Run migrations against a controlled local or test database:

```bash
npm run db:migrate
```

Review the Auth.js database boundary without selecting provider tokens or session tokens:

```bash
npm run auth:db-summary
```

Manual acceptance checks:

- Missing `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_GITHUB_ID`, or `AUTH_GITHUB_SECRET` means real migration/login verification is not complete.
- Unauthenticated `GET /api/account/me` must return `401`.
- After a real OAuth login, `GET /api/account/me` must return only `id`, `email`, `name`, and `image`.
- Responses and logs must not include provider tokens, session tokens, OAuth secrets, password hashes, API keys, bearer tokens, authorization headers, raw provider responses, or database connection strings.
- Saved history UI, version history UI, admin UI, and save/list/detail history APIs remain unavailable.

## Smoke Test

部署后可运行：

```bash
node scripts/smoke-travel-api.mjs --base-url http://127.0.0.1:3000 --expect-provider mock
```

真实 AI 部署时：

```bash
node scripts/smoke-travel-api.mjs --base-url https://your-domain.example --expect-provider openai-compatible
```

缺配置错误路径只用于临时验收：

```bash
node scripts/smoke-travel-api.mjs --base-url http://127.0.0.1:3000 --expect-provider missing-config
```

## 安全提醒

- API Key 只放在服务端 `.env.local` 或部署平台的服务端环境变量中。
- 不要把真实 API Key 写入 README、docs、源码、测试、浏览器端变量或 `NEXT_PUBLIC_*` 变量。
- 不要提交 `.env.local`。
- 真实 AI 输出仍是草稿，不代表门票、营业时间、酒店价格、交通班次、天气等信息一定准确。

## 当前未实现

- 数据库。
- 用户登录。
- 地图。
- 天气。
- 联网搜索。
- 服务端 PDF 导出或精确排版 PDF。
- 版本历史。
- 保存历史或保存到笔记。
- 方案对比。
- 行程优化。
- 真实票价、酒店价格、门票、交通班次、天气等实时数据能力。
- 非 Chat Completions / Responses 兼容格式的第三方 Provider。
