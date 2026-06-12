# MVP 发布检查清单

> **状态说明（第 49 轮）**：本文是历史 MVP 发布检查清单和阶段验收参考，保留用于追溯旧发布口径，不再作为当前执行依据。当前事实以 `docs/00-project-brief-and-roadmap.md`、`docs/08-project-state.md`、`docs/13-next-feature-roadmap.md`、`docs/14-delete-restore-design.md` 和当前代码为准。

本文档用于第 15 轮 MVP 部署环境确认与部署验收。当前发布对象仍是旅行计划草稿生成 MVP，不包含数据库、登录、地图、天气、联网搜索、服务端 PDF 导出、精确排版 PDF、版本历史、方案对比或行程优化。

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

## Current Round 32 Status Note

The round sections below are historical acceptance notes unless a later round supersedes them. As of Round 32, protected version history and restore UI are available, owner share-link UI is available on `/trips/[id]`, and `/shared/trips/[token]` is a public read-only share page. Admin UI, access-statistics UI, complex permission panels, public edit/restore/delete actions, and client-side database access remain unavailable.

## Round 22 Database Configuration Note

The app now includes a minimal server-only PostgreSQL skeleton for future saved history. Runtime configuration may include:

```env
DATABASE_URL=
```

Keep `DATABASE_URL` empty unless a real PostgreSQL database has been provisioned outside this round. Do not commit `.env`, `.env.local`, database passwords, server IPs, API keys, bearer tokens, or authorization headers. This round does not enable login, saved history UI, public save/list/detail APIs, or user-usable version history.

## Round 23 Auth Configuration Note

The app now includes a minimal server-side Auth.js session boundary for future account history APIs. Runtime examples may list only empty variable names:

```env
AUTH_SECRET=
AUTH_URL=
DATABASE_URL=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
```

Real OAuth login is considered configured only when `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_GITHUB_ID`, and `AUTH_GITHUB_SECRET` are all set in the server environment and the auth migrations have been applied. If any are missing, the auth provider is not treated as ready and `GET /api/account/me` must return `401` for unauthenticated access.

Release checks:

- `GET /api/account/me` returns `401` when no valid session is present.
- A valid session returns only user summary fields: `id`, `email`, `name`, and `image`.
- Responses, logs, docs, examples, and tests do not expose OAuth secrets, `AUTH_SECRET`, session tokens, provider tokens, `DATABASE_URL`, API keys, bearer tokens, or authorization headers.
- Saved history UI, version history UI, admin UI, and unauthenticated save/list/detail APIs remain unavailable.
- `POST /api/travel-plans/generate` and `POST /api/travel-plans/compare` behavior remains unchanged.

## Round 24 Real Auth Acceptance

Run the database migration only against a controlled local or test PostgreSQL database:

```bash
npm run db:migrate
```

Run the read-only database summary after migration and after a real OAuth login:

```bash
npm run auth:db-summary
```

Acceptance checks:

- The migration command reports only variable presence, migration filenames, and required table status.
- Required tables are present: `users`, `accounts`, `sessions`, `verification_token`, `trip_plan_records`, `trip_plan_versions`, `trip_plan_shares`, and `schema_migrations`.
- `GET /api/account/me` returns `401` when no valid session is present.
- After a real OAuth login, `GET /api/account/me` returns only `id`, `email`, `name`, and `image`.
- The database summary records only counts and user field-presence status; it must not select or print provider tokens, session tokens, OAuth secrets, password hashes, API keys, bearer tokens, authorization headers, raw provider responses, or connection strings.
- If any required auth/database environment variable is missing, record the item as not verified instead of marking it passed.
- Saved history UI, version history UI, admin UI, and save/list/detail history APIs remain unavailable.
- `POST /api/travel-plans/generate` and `POST /api/travel-plans/compare` behavior remains unchanged.

## Round 25 Saved History API Boundary

Round 25 enables only the minimum authenticated saved-history API loop:

- `POST /api/travel-plans/save` accepts `{ tripPlan }`, requires the current user, validates the snapshot with `TripPlanSchema`, and creates one record plus version `1`.
- `GET /api/travel-plans` requires the current user and returns only that user's non-deleted record summaries.
- `GET /api/travel-plans/[id]` requires the current user and returns that user's record summary plus the latest `TripPlan` snapshot.
- Missing, invalid, cross-owner, or soft-deleted detail records should return `404` instead of confirming whether another user's resource exists.
- Responses and logs must not expose owner ids, provider tokens, session tokens, OAuth secrets, password hashes, API keys, bearer tokens, authorization headers, raw provider responses, connection strings, SQL, or stack traces.

Release checks:

- Unauthenticated save/list/detail requests return `401` with `error.code=UNAUTHORIZED`.
- Invalid save request bodies return `400` with `error.code=BAD_REQUEST`.
- Save creates exactly one record and initial version `1` for the current user.
- List and detail APIs query by the current user's id and ignore soft-deleted records.
- Saved history page, version history UI, admin UI, restore API, versions list API, share links, automatic save, maps, weather, search, and visible history entries remain unavailable.
- `POST /api/travel-plans/generate` and `POST /api/travel-plans/compare` behavior remains unchanged.

## Round 26 Read-Only My Trips Pages

Round 26 enables only read-only saved history UI entry points:

- `/trips` lists the current logged-in user's saved trip summaries through `GET /api/travel-plans`.
- `/trips/[id]` shows one saved trip's current `TripPlan` snapshot through `GET /api/travel-plans/[id]`.
- Unauthenticated access shows an in-page login guide and must not render saved history data.
- The detail page keeps copy full text, download Markdown, and browser print/save PDF actions.
- The detail page must not show development JSON debug content.

Release checks:

- Unauthenticated `/trips` shows the login guide and does not expose saved trip data.
- Logged-in `/trips` shows title, departure city, destination, date range, derived days, safe source kind/provider labels, created time, and updated time.
- Logged-in `/trips/[id]` shows the saved `TripPlan` snapshot and export actions.
- The front-end list/detail client handles `401`, `404`, `500`, network errors, and invalid schemas with fixed error kinds.
- Front-end adapters strip internal fields such as owner ids, soft-delete markers, current version ids, restore metadata, and notes.
- No save button, automatic save, version history UI, restore API/UI, share link, admin UI, maps, weather, search, or client-side database access is added.
- `POST /api/travel-plans/generate` and `POST /api/travel-plans/compare` behavior remains unchanged.

## Round 27 Manual Save From Result Page

Round 27 enables a manual save entry only after a generated `TripPlan` is visible:

- The generated result action area shows `保存到我的行程` after successful generation.
- Clicking it calls `POST /api/travel-plans/save` with `{ tripPlan }`; no client code should bypass this API or connect directly to the database.
- The app must not automatically save every generated plan.
- Unauthenticated save attempts show a login prompt and open login in a new tab, so the current in-memory result remains on the original page.
- The generated `TripPlan` must not be persisted in `localStorage` or `sessionStorage`.
- Successful saves show safe record feedback and links to `/trips` and `/trips/[id]`.
- Save failures must use fixed safe messages for `401`, `400`, `500`, network, and invalid-response states.
- `/trips` and `/trips/[id]` remain read-only; no version history UI, restore, share link, admin UI, maps, weather, search, or client-side database access is added.
- `POST /api/travel-plans/generate` and `POST /api/travel-plans/compare` behavior remains unchanged.

Release checks:

- Unauthenticated generated-result save shows the login guide and keeps the current result visible in the original tab.
- Logged-in generated-result save returns a safe summary and links to the saved detail page.
- Re-clicking after a successful save is disabled or clearly marked as already saved for the current snapshot.
- Generating a new plan resets the manual save state for the new snapshot.
- Automated tests cover save client `401`/`400`/`500`, safe summary stripping, UI adapter safety, no browser storage persistence for `TripPlan`, and no automatic save call from the generation page.

## Round 28 Protected Version History APIs

Round 28 enables protected server-side version history APIs only:

- `GET /api/travel-plans/[id]/versions` returns safe version summaries for the current user's saved record and does not return full snapshots.
- `GET /api/travel-plans/[id]/versions/[versionId]` returns one safe version summary plus its `TripPlan` snapshot.
- `POST /api/travel-plans/[id]/versions` accepts `{ tripPlan }`, validates it with `TripPlanSchema`, appends the next version, and updates the current version pointer.
- `POST /api/travel-plans/[id]/restore` accepts `{ versionId }`, copies that owned version snapshot into a new current version, and leaves historical versions immutable.
- All four APIs require `requireCurrentUser()` and scope every read/write by the current user.
- Missing, invalid, soft-deleted, or cross-owner records and versions return `404`.
- Version history UI, restore UI/buttons, share links, admin UI, and client-side database access remain unavailable.
- `POST /api/travel-plans/generate` and `POST /api/travel-plans/compare` behavior remains unchanged.

Release checks:

- Unauthenticated versions list/detail/append/restore requests return `401` with `error.code=UNAUTHORIZED`.
- Invalid append snapshots return `400` with `error.code=BAD_REQUEST`.
- Invalid restore bodies return `400` with `error.code=BAD_REQUEST`.
- Cross-owner or missing versions and records return `404` with `error.code=NOT_FOUND`.
- Append increments `version_number` and updates `trip_plan_records.current_version_id`.
- Restore creates a new version copied from the restored snapshot instead of mutating the old version.
- Responses and logs must not expose owner ids, internal record ids, restore metadata, notes, provider tokens, session tokens, OAuth secrets, password hashes, API keys, bearer tokens, authorization headers, raw provider responses, connection strings, SQL, or stack traces.

## Round 31 Share Link APIs

Round 31 enables only the minimum server-side share-link API loop:

- `POST /api/travel-plans/[id]/share-links` requires the current user, creates a fixed-version share for the user's own saved record, and returns the raw token/share URL only once.
- `GET /api/travel-plans/[id]/share-links` requires the current user and returns safe share summaries without raw tokens or token hashes.
- `PATCH /api/travel-plans/[id]/share-links/[shareId]` requires the current user and soft-revokes only that user's share link.
- `GET /api/shared/trips/[token]` does not require login and returns only a public read-only `TripPlan` snapshot plus minimal non-sensitive metadata for a valid active non-expired token.
- Tokens are generated server-side and stored only as hashes; `token_preview` is not a credential.
- Missing, invalid, revoked, expired, deleted-record, and cross-boundary shares return `404`.
- Share UI, public share pages, admin UI, complex permission backend, and client-side database access remain unavailable.
- `POST /api/travel-plans/generate`, `POST /api/travel-plans/compare`, save, history, versions, and restore behavior remains unchanged.

Release checks:

- Unauthenticated owner share create/list/revoke requests return `401` with `error.code=UNAUTHORIZED`.
- Cross-owner create/revoke/list targets return `404` with `error.code=NOT_FOUND`.
- Create returns raw token/share URL once, but list/revoke/public responses do not return raw tokens or token hashes.
- Revoked or expired public tokens return `404`.
- Public responses do not expose owner ids, email, token hashes, internal record fields, provider/session tokens, OAuth secrets, password hashes, API keys, bearer tokens, authorization headers, raw provider responses, connection strings, SQL, or stack traces.

## Round 32 Share UI And Public Read-Only Page

Round 32 enables the minimum UI surface for the Round 31 share APIs:

- `/trips/[id]` includes an owner-only “分享链接” section.
- Owners can create a share link, copy the one-time share URL returned by the create API, list safe share summaries, and revoke an active link after confirmation.
- Share lists must not display raw tokens or token hashes.
- `/shared/trips/[token]` does not require login and renders a public read-only `TripPlan` snapshot for a valid active link.
- Public pages must keep AI draft and human-verification wording visible.
- Public pages must not show save, version history, restore, revoke, create-share, edit, delete, debug JSON, owner data, internal record/version/share fields, or token hashes.
- Invalid, revoked, expired, missing, deleted-record, and otherwise unavailable public links must show the same unavailable message: `分享链接不可用或已失效`.
- Public share URLs are readable by anyone who has the URL; owners should share carefully and revoke links when access is no longer intended.
- Admin UI, access-statistics UI, complex permission panels, public write operations, and client-side database access remain unavailable.
- `POST /api/travel-plans/generate`, `POST /api/travel-plans/compare`, save, history, versions, and restore behavior remains unchanged.

Release checks:

- `npm test`, `npm run lint`, `npm run build`, and `npx tsc --noEmit` all pass.
- Share clients map `401`, `404`, and `500` safely and strip owner/internal fields.
- Create client accepts only one-time `shareUrl` and/or `token`; list/revoke/public adapters do not expose raw tokens or token hashes.
- Revoke uses `PATCH /api/travel-plans/[id]/share-links/[shareId]` with `{ status: "revoked" }`.
- Public shared-trip adapter exposes only public metadata plus the `TripPlan` snapshot.
- Browser acceptance for create/copy/open/revoke requires a real configured database and authenticated saved trip; if those are missing, record the limitation instead of marking it passed.

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
- 复制全文、下载 Markdown 和浏览器打印/保存 PDF 入口可见。

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
- 页面可展示 AI 草稿结果、复制全文、下载 Markdown 和浏览器打印/保存 PDF 入口。
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

## Docker Compose 云服务器部署

目标云服务器需要预先安装：

- Git。
- Docker。
- Docker Compose。
- 可访问 `https://github.com/KECIHH/traceme-next.git`。默认使用 HTTPS 克隆公开仓库，不要求服务器配置 GitHub SSH key；私有仓库或 SSH 部署可通过 `TRACEME_REPO_URL` 覆盖为可访问的仓库地址。

一行部署命令：

```bash
curl -fsSL https://raw.githubusercontent.com/KECIHH/traceme-next/main/scripts/deploy-docker-compose.sh | sh
```

可选覆盖：

```bash
curl -fsSL https://raw.githubusercontent.com/KECIHH/traceme-next/main/scripts/deploy-docker-compose.sh | TRACEME_APP_DIR=/opt/traceme-next APP_PORT=3000 sh
```

部署脚本行为：

- 默认从 `https://github.com/KECIHH/traceme-next.git` 克隆或更新 `main` 分支。
- 如果服务器项目目录没有 `.env`，创建只含空值/mock 默认的 `.env`。
- 执行 `docker compose build`。
- 执行 `docker compose up -d`。
- 执行 `node scripts/smoke-travel-api.mjs` 验证首页和 `POST /api/travel-plans/generate`。

真实 AI 部署前，应先在服务器项目目录的 `.env` 中配置服务端环境变量；不要提交 `.env`。

## 部署后 Smoke Test

部署后运行：

```bash
node scripts/smoke-travel-api.mjs --base-url https://your-domain.example --expect-provider openai-compatible
```

mock 部署运行：

```bash
node scripts/smoke-travel-api.mjs --base-url https://your-domain.example --expect-provider mock
```

缺配置错误路径只用于临时环境：

```bash
node scripts/smoke-travel-api.mjs --base-url http://127.0.0.1:3000 --expect-provider missing-config
```

通过标准：

- 首页返回 HTTP 200，且包含应用标识文本。
- mock 部署返回 HTTP 200、`ok: true`、`source.provider=mock`、`source.kind=mock`。
- 真实 AI 部署返回 HTTP 200、`ok: true`、`source.provider=openai-compatible`、`source.kind=ai`。
- `input.days` 与 `dailyItinerary.length` 一致。
- `userVerifyItems` 覆盖门票/预约、营业时间、酒店价格、交通班次/价格、天气五类。
- smoke 输出只包含安全摘要，不包含真实 API Key、模型名、完整 provider URL、完整 prompt 或完整响应。

## 当前工作区改动归属

第 15 轮开始时的状态：

- Staged：无。
- Unstaged：无。
- Untracked：无。
- 当前分支：`main...origin/main`。

第 15 轮本身只应新增或修改部署说明、Docker Compose 部署包装、smoke/deploy 脚本、发布检查清单和项目状态记录，不应修改核心业务逻辑。

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

Docker Compose 额外支持 `APP_PORT` 控制服务器宿主机端口；它不是 AI 配置变量。

## 已知限制

- 当前生成结果是规划草稿，不是实时事实源。
- 没有数据库和用户系统，结果不会保存到账户。
- 没有地图、天气、联网搜索、真实票价、酒店价格、门票和交通班次查询。
- 支持浏览器打印/保存 PDF，但没有服务端 PDF 导出、精确排版 PDF、版本历史、保存历史、方案对比和行程优化。
- `openai-compatible` 仅覆盖兼容 Chat Completions 或 Responses 的 provider 形态。
- in-app Browser 可能无法验证实际下载落盘，只能验证页面反馈和下载触发。
