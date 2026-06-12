# 迹遇 Next

迹遇 Next 是一个个人测试版旅行规划工作台。用户填写出发地、目的地、日期、人数、预算和偏好后，应用通过服务端生成结构化旅行计划草稿，并支持方案对比、导出、登录后保存、历史查看、版本恢复、只读分享、软删除、最近删除和恢复删除。

当前输出仅作为旅行规划草稿。门票、营业时间、酒店价格、交通班次、交通价格、天气等实时或易变信息需要用户在出行前自行核对。

## 当前个人测试版能力

- 旅行信息表单：支持出发地、目的地、日期、人数、预算口径、偏好和节奏。
- 本地目的地推荐：使用静态推荐项回填目的地，不代表实时热度或实时价格。
- 旅行计划生成：统一通过服务端 `POST /api/travel-plans/generate`。
- 方案对比：主方案生成后，可生成轻量变体、节奏建议、预算风险和人工确认提示。
- Provider 切换：支持 `AI_PROVIDER=mock` 和 `AI_PROVIDER=openai-compatible`。
- 结构化结果展示：包含总览、每日行程、景点、餐饮、住宿、交通、预算、准备清单、风险提醒、用户自行确认事项和免责声明。
- 导出体验：支持复制全文、下载 Markdown，以及使用浏览器打印/保存 PDF。
- 账号与历史：配置数据库和 Auth 后，支持登录、手动保存、我的行程列表和保存详情页。
- 版本历史：保存详情页支持查看版本历史，并通过恢复旧版本创建新的当前版本。
- 分享链接：保存详情页支持创建、复制、列出和撤销固定版本分享链接；公开分享页为只读视图。
- 删除与恢复：保存行程支持 owner-only 软删除、最近删除列表，以及恢复删除窗口内的恢复操作。
- 契约校验：当前请求和结果以 `GenerateTripPlanRequestSchema` 与 `TripPlanSchema` 为准；旧字段 `travelStyle`、`specialRequests`、`verificationItems` 只作为历史设计参考，不是当前契约。
- 错误提示：前端展示用户友好的错误文案，不展示底层 provider 响应或敏感配置。

当前个人版功能完善路线图见 [docs/13-next-feature-roadmap.md](docs/13-next-feature-roadmap.md)。

下方按 Round 记录的章节保留历史 checkpoint；其中“本轮仍未添加...”只描述当时边界，不代表当前基线。

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

首次部署会在服务器项目目录创建未提交的 `.env` mock 示例。真实 AI、数据库和 Auth 部署时，只在服务器 `.env` 中配置以下变量名对应的服务端值：

```env
AI_PROVIDER=
AI_API_KEY=
AI_MODEL=
AI_CHAT_COMPLETIONS_URL=
AI_REQUEST_TIMEOUT_MS=
DATABASE_URL=
AUTH_SECRET=
AUTH_URL=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_TRUST_HOST=
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

Leave `DATABASE_URL` empty when no PostgreSQL database is available. Round 22 did not expose login, saved history UI, public save/list/detail APIs, or user-usable version history. Do not commit `.env`, `.env.local`, real database passwords, server addresses, API keys, bearer tokens, or authorization headers.

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
- Saved history UI, version history UI, admin UI, restore/version APIs, share UI/pages, and any history page entry remain unavailable at this auth-boundary checkpoint.

## Saved History API Boundary

Round 25 adds the minimum authenticated server API loop for saved travel plans:

- `POST /api/travel-plans/save` saves `{ tripPlan }` for the current logged-in user only.
- `GET /api/travel-plans` lists only the current user's non-deleted saved plan records.
- `GET /api/travel-plans/[id]` returns only the current user's record summary and latest `TripPlan` snapshot.

All three APIs require `requireCurrentUser()` and return `401` when no valid login session is present. Missing, invalid, or cross-owner detail records return `404` to avoid exposing resource existence. Responses return only non-sensitive summaries and must not include user ownership ids, provider tokens, session tokens, OAuth secrets, database connection strings, API keys, bearer tokens, authorization headers, raw provider responses, or SQL details.

Round 26 adds the first read-only saved history entry points:

- `/trips` shows the current logged-in user's saved trip summaries.
- `/trips/[id]` shows one saved trip's current `TripPlan` snapshot.

These pages fetch only through the protected list/detail APIs above. Unauthenticated users see an in-page login guide and no saved data. The pages do not add a save button, automatic save, version history UI, restore, share link, admin UI, maps, weather, search, or any client-side database access. `POST /api/travel-plans/generate` and `POST /api/travel-plans/compare` remain unchanged.

Round 27 adds the first manual save entry on the generated result page:

- The result action area shows `保存到我的行程` only after a `TripPlan` is successfully generated.
- The button calls only `POST /api/travel-plans/save`; generated plans are not saved automatically.
- Saving requires login. If the user is not logged in, the page keeps the current generated result in memory, shows a login prompt, and opens the login entry in a new tab so the user can return and click save again.
- The generated `TripPlan` is not written to `localStorage` or `sessionStorage`.
- After a successful save, the page links to `/trips` and `/trips/[id]`.
- This round still does not add version history UI, restore, share links, admin UI, or client-side database access. `POST /api/travel-plans/generate` and `POST /api/travel-plans/compare` remain unchanged.

Round 28 adds protected server-side version history APIs only:

- `GET /api/travel-plans/[id]/versions` lists safe version summaries for the current user's saved record.
- `GET /api/travel-plans/[id]/versions/[versionId]` returns one safe version summary plus its `TripPlan` snapshot.
- `POST /api/travel-plans/[id]/versions` appends a validated `{ tripPlan }` snapshot as the next version.
- `POST /api/travel-plans/[id]/restore` creates a new current version copied from an owned historical version.

All four APIs require `requireCurrentUser()`. Missing, invalid, soft-deleted, or cross-owner records and versions return `404`. Version summaries do not expose full snapshots; only the version detail API returns a `TripPlan`. This round still does not add version history UI, restore UI/buttons, share links, admin UI, or client-side database access. `POST /api/travel-plans/generate` and `POST /api/travel-plans/compare` remain unchanged.

Round 31 adds the minimum server-side share-link API loop:

- `POST /api/travel-plans/[id]/share-links` creates one active fixed-version share link for the current user's saved record and returns the raw token/share URL only once.
- `GET /api/travel-plans/[id]/share-links` lists safe share summaries for the current user's saved record without raw tokens or token hashes.
- `PATCH /api/travel-plans/[id]/share-links/[shareId]` revokes the current user's share link with a soft revoke.
- `GET /api/shared/trips/[token]` returns a public read-only `TripPlan` snapshot for a valid active non-expired token.

Share tokens are generated server-side and only `token_hash` plus a short `token_preview` are stored. Revoked, expired, missing, invalid, deleted-record, or cross-boundary shares return `404`. Public responses do not expose owner ids, email, token hashes, internal record fields, provider/session tokens, OAuth secrets, database connection strings, API keys, bearer tokens, authorization headers, SQL, or stack traces. This round still does not add share UI, a public share page, admin UI, complex permissions, or client-side database access. `POST /api/travel-plans/generate`, `POST /api/travel-plans/compare`, save, history, versions, and restore behavior remain unchanged.

Round 32 adds the minimum share-link UI and public read-only page:

- `/trips/[id]` shows an owner-only “分享链接” section after the saved snapshot. Logged-in owners can create a share link, copy the one-time link returned by the server, list safe share summaries, and revoke active links.
- `/shared/trips/[token]` loads `GET /api/shared/trips/[token]` without login and displays the shared `TripPlan` snapshot in read-only mode.
- Public share pages do not show save, version history, restore, revoke, create-share, edit, delete, or debug JSON actions.
- Public share links are visible to anyone who has the URL. Users should share them carefully and revoke links that should no longer be accessible.
- Invalid, revoked, expired, missing, or otherwise unavailable public links show the same unavailable message and do not reveal the specific reason.
- This round still does not add admin UI, access-statistics UI, complex permissions, public editing/restore/delete operations, or client-side database access. Existing generate, compare, save, history, versions, and restore API behavior remains unchanged.

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

## Current Not Implemented

- Automatic save.
- Undo, hard-delete retention, account deletion, and fine-grained permission controls.
- Public edit, restore, delete, save, version-history, share-management, or analytics operations.
- Admin UI.
- Maps, weather, enhanced web search, live ticket/hotel/transport/weather data, or server-side PDF export.
- User settings and data statistics.
- Non-Chat-Completions/Responses-compatible third-party provider adapters.
