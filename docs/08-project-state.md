# Project State - MVP Round 28
## Round 28 Current State
- Round 28 adds the protected version-history API minimum loop without adding version-history UI.
- Added `GET /api/travel-plans/[id]/versions`, which requires `requireCurrentUser()` and returns safe version summaries for the current user's non-deleted record.
- Added `GET /api/travel-plans/[id]/versions/[versionId]`, which requires `requireCurrentUser()` and returns one safe version summary plus the saved `TripPlan` snapshot.
- Added `POST /api/travel-plans/[id]/versions`, which requires `requireCurrentUser()`, accepts `{ tripPlan }`, validates it with `TripPlanSchema`, appends the next version, and updates the current-version pointer.
- Added `POST /api/travel-plans/[id]/restore`, which requires `requireCurrentUser()`, accepts `{ versionId }`, copies that owned version snapshot into a new current version, and does not mutate old versions.
- Version and restore API responses omit owner ids, record ids, raw snapshot fields in summaries, restore metadata, notes, soft-delete markers, SQL, stack traces, connection strings, tokens, secrets, API keys, bearer values, and authorization headers.
- Post-review fix: the versions list repository query now selects only version summary columns and does not read or parse full `TripPlan` snapshots.
- Missing, invalid, soft-deleted, or cross-owner records and versions return `404 NOT_FOUND`.
- Existing `POST /api/travel-plans/generate` behavior remains unchanged.
- Existing `POST /api/travel-plans/compare` behavior remains unchanged.

## Round 28 Boundaries
- No version history UI was added.
- No restore button or restore UI was added.
- No share link or admin UI was added.
- No client-side database access was added; the new version operations are server API capabilities only.
- No `.env` or `.env.local` content was added to docs, tests, source, or output.

## Round 28 Verification
- `npm test`: passed, 62 tests.
- `npm run lint`: passed.
- `npm run build`: passed; build output includes `/api/travel-plans/[id]/versions`, `/api/travel-plans/[id]/versions/[versionId]`, and `/api/travel-plans/[id]/restore` without share/admin routes.
- `npx tsc --noEmit`: passed.
- Automated tests cover unauthenticated versions list/detail/append/restore `401`.
- Automated tests cover missing or cross-owner version access returning `404`.
- Automated tests cover append `TripPlanSchema` validation and safe summary responses.
- Automated tests cover repository version-number incrementing and restore-by-copy creation.
- Automated tests cover list excluding snapshots at the response and repository-query levels, detail returning snapshots, and response safety for internal/sensitive fields.

## Round 28 Record Time
- Date: 2026-06-09 (Asia/Shanghai)
- Stage: MVP coding round 28

# Project State - MVP Round 27
## Round 27 Current State
- Round 27 adds the first manual save entry on the generated result page without adding automatic save.
- The generated result action area can show `保存到我的行程` only when `TripPlanResult` receives `showSaveAction`.
- The main generation page passes `showSaveAction` after a successful `TripPlan` generation.
- Saved trip detail pages keep the default read-only behavior and do not show the save entry.
- Added a front-end save client that posts `{ tripPlan }` only to `POST /api/travel-plans/save`.
- Added a pure save-action UI adapter that maps idle, saving, saved, and error states to safe button labels, feedback text, and links.
- Unauthenticated save attempts show a login prompt with a new-tab login link so the current generated result remains on the original page in memory.
- The generated `TripPlan` is not written to `localStorage` or `sessionStorage`.
- Successful saves disable repeat save for the current snapshot, show success feedback, and link to `/trips` and `/trips/[id]`.
- A new generated snapshot resets the save state by `tripPlan.id` plus `tripPlan.generatedAt`.
- Post-review fix: stale save completions are ignored unless the current save state is still `saving` for the same snapshot key, preventing an older request from clearing a newer snapshot's save-in-progress state.
- Existing `POST /api/travel-plans/generate` behavior remains unchanged.
- Existing `POST /api/travel-plans/compare` behavior remains unchanged.

## Round 27 Boundaries
- No automatic save was added.
- No version history UI, versions list UI, restore, share link, or admin UI was added.
- No client-side database access was added; saving uses only the protected save API.
- No `userId`, `DATABASE_URL`, auth secret, OAuth secret, API key, bearer token, authorization header value, SQL, stack trace, or raw provider response is intentionally exposed.
- No `.env` or `.env.local` content was added to docs, tests, source, or output.

## Round 27 Verification
- `npm test`: passed, 48 tests.
- `npm run lint`: passed.
- `npm run build`: passed; build output includes the existing `/api/travel-plans/save`, `/trips`, and `/trips/[id]` routes without new restore/share/admin routes.
- `npx tsc --noEmit`: passed.
- Automated tests were added for save client `401`, `400`, and `500` mapping.
- Automated tests were added for safe success-summary mapping and stripping of internal record/version fields.
- Automated tests were added for the UI adapter's safe success and unauthenticated-login view models.
- Automated tests were added to confirm the save entry code does not use `localStorage` or `sessionStorage` for `TripPlan` snapshots.
- Automated tests were added to confirm the generation page does not import or call the save client automatically.
- Post-review regression coverage confirms stale save completions cannot overwrite a newer snapshot's active save state.
- Local HTTP acceptance used the existing dev server at `http://127.0.0.1:3152`; unauthenticated `POST /api/travel-plans/save` with a valid `TripPlan` returned HTTP `401` and did not include `userId`, `DATABASE_URL`, `AUTH_SECRET`, SQL, or stack details in the response body.
- Full browser acceptance for logged-in save and `/trips/[id]` navigation was not completed in this environment because no authenticated browser session with real OAuth/database state was available.

## Round 27 Record Time
- Date: 2026-06-09 (Asia/Shanghai)
- Stage: MVP coding round 27

# Project State - MVP Round 26
## Round 26 Current State
- Round 26 adds the minimum read-only saved-history UI entry points without adding any new write path.
- Added `/trips`, which loads the current logged-in user's saved trip summaries through `GET /api/travel-plans`.
- Added `/trips/[id]`, which loads one saved trip's current `TripPlan` snapshot through `GET /api/travel-plans/[id]`.
- Added a front-end trip history client/service adapter that maps `401`, `404`, server, network, and invalid-schema failures to fixed UI error kinds.
- The front-end adapter validates and strips response data before UI use, so owner ids, soft-delete markers, current-version pointers, restore metadata, and notes are not exposed to the pages.
- The list page shows title, departure city, destination, date range, derived days, safe source kind/provider labels, created time, and updated time.
- The detail page reuses `TripPlanResult` for the saved snapshot and keeps copy full text, download Markdown, and browser print/save PDF actions.
- `TripPlanResult` now supports `showDebugJson`; generated results keep the previous default, while saved trip detail hides the development JSON preview.
- Unauthenticated users see an in-page login guide and no saved history data is rendered.
- Existing `POST /api/travel-plans/generate` behavior remains unchanged.
- Existing `POST /api/travel-plans/compare` behavior remains unchanged.
- Post-review fix: formatted the conditional development JSON preview block in `TripPlanResult`; this did not change visibility behavior, export actions, APIs, or saved-history boundaries.

## Round 26 Boundaries
- No save-to-history button was added.
- No automatic save was added.
- No version history UI, versions list UI, restore, share link, or admin UI was added.
- No client-side database access was added; pages use only the protected list/detail APIs.
- No `userId`, `DATABASE_URL`, auth secret, OAuth secret, API key, bearer token, authorization header value, SQL, or raw provider response is intentionally exposed.
- No `.env` or `.env.local` content was added to docs, tests, source, or output.

## Round 26 Verification
- `npm test`: passed, 39 tests.
- `npm run lint`: passed.
- `npm run build`: passed; build output includes `/trips` and `/trips/[id]` plus the existing protected history APIs.
- `npx tsc --noEmit`: passed.
- Automated tests cover list/detail client handling for `401`, `404`, non-2xx success-shaped responses, plus response adapter stripping of internal record/version fields.
- Local production HTTP smoke passed: `/trips` returned HTTP `200` and included the page title; unauthenticated `GET /api/travel-plans` and `GET /api/travel-plans/[id]` returned HTTP `401` with `error.code=UNAUTHORIZED` and no `userId` in the response body.
- Logged-in browser acceptance for `/trips` and `/trips/[id]` was not completed in this environment because no active local browser session with saved trip data was available.

## Round 26 Record Time
- Date: 2026-06-09 (Asia/Shanghai)
- Stage: MVP coding round 26

# Project State - MVP Round 25
## Round 25 Current State
- Round 25 adds the minimum authenticated saved-history API loop without adding any saved history UI.
- Added `POST /api/travel-plans/save`, which requires `requireCurrentUser()`, accepts `{ tripPlan }`, validates the snapshot with `TripPlanSchema`, and creates one `trip_plan_records` row plus one `trip_plan_versions` row with `versionNumber = 1`.
- Added `GET /api/travel-plans`, which requires `requireCurrentUser()` and returns only the current user's non-deleted record summaries.
- Added `GET /api/travel-plans/[id]`, which requires `requireCurrentUser()` and returns the current user's record summary plus the latest saved `TripPlan` snapshot.
- Added a reusable saved-history API handler layer with injectable auth/repository dependencies for tests, while production routes pass the real `requireCurrentUser()` and server repository functions.
- Added repository support for atomic initial save and current-version lookup.
- Responses return non-sensitive summaries and do not expose owner ids, soft-delete markers, provider/session tokens, OAuth secrets, database connection strings, API keys, bearer tokens, authorization headers, SQL, or stack traces.
- Missing, invalid, cross-owner, or soft-deleted detail records return `404 NOT_FOUND`.
- Existing `POST /api/travel-plans/generate` behavior remains unchanged.
- Existing `POST /api/travel-plans/compare` behavior remains unchanged.

## Round 25 Boundaries
- No saved history page or visible history entry was added.
- No version history UI, versions list API, restore API, share link, admin UI, automatic save, maps, weather, or search capability was added.
- No unauthenticated save/list/detail API was added.
- Default save title is still derived from the `TripPlan` snapshot; no custom title or note input is exposed.
- List/detail continue to ignore soft-deleted records.

## Round 25 Verification
- `npm test`: passed, 31 tests.
- `npm run lint`: passed.
- `npm run build`: passed; build output includes `/api/travel-plans`, `/api/travel-plans/[id]`, and `/api/travel-plans/save` plus the existing generate/compare/account/auth routes.
- `npx tsc --noEmit`: passed after the production build regenerated `.next/types`.
- Automated tests cover unauthenticated save/list/detail `401`, invalid save `400`, successful initial save record+version creation, owner-scoped list/detail behavior, no out-of-scope restore/version/share/admin/history routes, and repository owner/soft-delete query boundaries.

## Round 25 Record Time
- Date: 2026-06-09 (Asia/Shanghai)
- Stage: MVP coding round 25

# Project State - MVP Round 24
## Round 24 Current State
- Round 24 adds safe local acceptance tooling for real PostgreSQL migrations and the Auth.js OAuth/session boundary.
- Added `npm run db:migrate`, which loads ignored local env files or process env, applies `db/migrations/*.sql` in filename order, and records applied files in `schema_migrations`.
- Added `npm run auth:db-summary`, a read-only summary command that reports required table status, auth row counts, and latest user field-presence only.
- Tightened the Auth.js readiness gate so real OAuth login requires `AUTH_URL` as well as database, secret, and OAuth credentials.
- Added automated tests for the new acceptance tooling fail-closed path, redacted env presence output, non-sensitive summary query scope, and package script wiring.
- Updated README and `docs/09-release-checklist.md` with real Auth acceptance steps using empty variable names and redacted output expectations.
- No save history API, history page, version history UI, or admin UI was added.
- Existing `POST /api/travel-plans/generate` behavior remains unchanged.
- Existing `POST /api/travel-plans/compare` behavior remains unchanged.

## Round 24 Verification
- Initial local preflight found no checked-in or shell-provided auth/database environment values; no real value was recorded.
- A local Docker PostgreSQL test database was started with one-time process-scoped credentials that were not written to `.env`, docs, tests, or source files.
- `npm run db:migrate`: verified against the local Docker PostgreSQL test database. The first run applied `0001_account_history_skeleton.sql` and `0002_auth_session_boundary.sql`; the repeat run skipped both already-recorded migrations.
- Required table status was verified as present: `users`, `accounts`, `sessions`, `verification_token`, `trip_plan_records`, `trip_plan_versions`, and `schema_migrations`.
- `npm run auth:db-summary`: verified table presence and reported auth row counts on the local Docker PostgreSQL test database before and after the real OAuth login check.
- Real OAuth login session was verified through the local fixed-port app. After login, `GET /api/account/me` returned `ok: true` with only the non-sensitive user summary fields `id`, `email`, `name`, and `image`.
- Post-login database summary verified expected Auth.js records without selecting sensitive token columns: `users=1`, `accounts=1`, and `sessions=1`; latest user `id`, `email`, `name`, and `image` fields were present.
- Post-review fix: the local auth readiness check now also requires `AUTH_URL`, so missing callback base URL cannot be mistaken for a configured real OAuth login path.
- Final acceptance repair check: the redacted migration and database-summary commands were rerun against the local Docker PostgreSQL test database; table verification and real OAuth session verification passed.
- Unauthenticated `GET /api/account/me` was verified on a local dev server and returned HTTP `401` with `error.code=UNAUTHORIZED`.
- Logged-in `GET /api/account/me` was verified and no token, secret, password hash, session token, provider token, database connection string, API key, bearer token, or authorization header value was recorded.
- API boundary check confirmed `src/app/api` still contains only `/api/account/me`, `/api/auth/[...nextauth]`, `/api/travel-plans/generate`, and `/api/travel-plans/compare`.
- Search confirmed no save/history/version/restore API or UI route was added under `src/app/api`, `src/app/page.tsx`, or `src/components`.
- Secret scan produced only expected safety-text, test fixture, migration-schema, and server-side header-construction hits; no real secret value, connection string, API key, bearer token, authorization header value, or provider token was recorded.

## Round 24 Command Results
- `npm test`: passed, 22 tests.
- `npm run lint`: passed.
- `npm run build`: passed; build output still exposes `/api/account/me`, `/api/auth/[...nextauth]`, `/api/travel-plans/compare`, and `/api/travel-plans/generate`.
- `npx tsc --noEmit`: passed.

## Round 24 Next Steps
- Keep the local Docker PostgreSQL and OAuth credentials out of git-tracked files and shared docs.
- Re-run the same redacted migration, OAuth, account summary, and database summary checks after any auth or migration change.
- Enter saved history API work only after preserving the current authenticated-user and non-sensitive-summary boundaries.

## Round 24 Record Time
- Date: 2026-06-09 (Asia/Shanghai)
- Stage: MVP acceptance round 24

# Project State - MVP Round 23
## Round 23 Current State
- Round 23 establishes the minimum server-side authentication/session boundary for future saved history APIs.
- Added Auth.js with the PostgreSQL adapter and a Next.js App Router auth route at `/api/auth/[...nextauth]`.
- Added a compatibility migration for Auth.js account/session tables while preserving the Round 22 `users` table and UUID ownership model.
- Added server-only current-user helpers: `getCurrentUser()`, `getOptionalCurrentUser()`, and `requireCurrentUser()`.
- Added `GET /api/account/me` as a minimal protected API that returns only a non-sensitive user summary.
- Updated `.env.local.example`, Docker Compose passthrough, README, and the release checklist with empty auth variable names and security boundaries.
- Added tests for the auth migration, protected API unauthorized behavior, and non-sensitive user summary mapping.

## Round 23 Auth Status
- Real login provider verification is not complete in this environment.
- Real OAuth login is treated as configured only when `AUTH_SECRET`, `DATABASE_URL`, `AUTH_GITHUB_ID`, and `AUTH_GITHUB_SECRET` are all set in the server environment and the auth migrations have been applied.
- When auth is not configured or no valid session exists, `GET /api/account/me` returns `401`.
- No OAuth secret, session secret, database connection string, API key, bearer token, authorization header, real provider response, or real server IP was recorded.

## Round 23 Boundaries
- Saved history UI is still not exposed.
- Version history UI is still not exposed.
- Admin UI is still not implemented.
- No maps, weather, search, or real-time travel data integration was added.
- No unauthenticated save/list/detail API was added.
- Existing `POST /api/travel-plans/generate` behavior remains unchanged.
- Existing `POST /api/travel-plans/compare` behavior remains unchanged.

## Round 23 Verification
- `npm test`: passed, 17 tests.
- `npm run lint`: passed.
- `npm run build`: passed; build output now exposes `/api/account/me`, `/api/auth/[...nextauth]`, `/api/travel-plans/compare`, and `/api/travel-plans/generate`.
- `npx tsc --noEmit`: passed.
- Real PostgreSQL migration execution and real OAuth login verification: not run in this environment because no real auth provider or database credentials were provided.

## Round 23 Next Steps
- Provision a real PostgreSQL database and apply migrations in a controlled environment.
- Configure `AUTH_SECRET`, `AUTH_URL`, and one OAuth provider in server-only environment variables.
- Verify a full OAuth sign-in flow and then retest `GET /api/account/me` with a real authenticated session.
- Build authenticated save/list/detail history APIs only after the current-user boundary is verified.

## Round 23 Record Time
- Date: 2026-06-08
- Stage: MVP coding round 23

# Project State - MVP Round 22
## Round 22 Current State
- Round 22 establishes the minimum PostgreSQL database skeleton for future saved history, version history, and login integration.
- Added a SQL migration for `users`, `trip_plan_records`, and `trip_plan_versions`.
- Added a server-only database connection boundary that reads `DATABASE_URL` only from the server environment.
- Added internal repository functions for creating/listing/reading trip plan records and versions, without adding public routes or UI.
- Added non-external-DB tests for migration presence, persistence helper validation, metadata derivation, and `TripPlan` JSON snapshot compatibility.
- Added `DATABASE_URL=` empty examples and Docker Compose environment passthrough. No real database URL, password, server IP, API key, bearer token, or authorization header was recorded.

## Round 22 Boundaries
- Login is still not implemented.
- Saved history UI is still not exposed.
- User-usable version history is still not exposed.
- No unauthenticated save/list/detail API was added.
- Existing `POST /api/travel-plans/generate` behavior remains unchanged.
- Mock and openai-compatible providers remain in place.
- Database provisioning, backups, volumes, production migrations, and real connection verification remain future deployment work.

## Round 22 Verification
- `npm test`: passed, 14 tests.
- `npm run lint`: passed.
- `npm run build`: passed; build output still exposes only `/`, `/_not-found`, `/api/travel-plans/compare`, and `/api/travel-plans/generate`.
- `npx tsc --noEmit`: passed.
- Real PostgreSQL migration/connection verification: not run in this environment because no `DATABASE_URL` was provided.

## Round 22 Record Time
- Date: 2026-06-08
- Stage: MVP coding round 22

# Project State - MVP Round 21
## Round 21 Current State
- Round 21 is a documentation-only design round for future login, database persistence, saved history, version history, and restore capability.
- Added `docs/10-account-history-design.md` as a technical design draft for the later travel planning workspace phase.
- The current beta still has no database, no user login, no saved history, no version history, no rollback, and no share links.
- The existing `POST /api/travel-plans/generate` request/response behavior remains unchanged.
- No ORM, Auth SDK, database dependency, migration, storage implementation, or account API route was added.
- No maps, weather, search, server PDF generation, formal admin backend, or real-time travel data capability was added.
- No core business code was changed as part of this round.
- No real server address, real secret, server-only credential, or raw provider response was recorded.

## Round 21 Design Summary
- The design explains why the MVP intentionally launched without database or login: the first goal was to validate generation, schema validation, display, Markdown export, and browser print/save-PDF before adding account risk and operations load.
- Future persistence is designed around saving a complete `TripPlan` JSON snapshot while storing list/detail metadata separately.
- Proposed draft entities:
  - `User`
  - `TripPlanRecord`
  - `TripPlanVersion`
  - Optional future `TripPlanShare` / `ShareLink`
- Proposed history API drafts:
  - `POST /api/travel-plans/save`
  - `GET /api/travel-plans`
  - `GET /api/travel-plans/:id`
  - `POST /api/travel-plans/:id/versions`
  - `POST /api/travel-plans/:id/restore`
- All future history APIs require login and must scope reads/writes by the current `userId`.
- Restore creates a new version from an older snapshot and updates the current pointer; old versions remain immutable.
- First-phase deletion is soft delete with `deletedAt`; normal list/detail APIs hide deleted records.
- Share links are not recommended for the first account-history implementation.
- Candidate routes were compared:
  - Self-hosted PostgreSQL plus login service.
  - Managed database and login.
  - SQLite or local-file storage for local spikes only, not the recommended Docker beta history path.
- Recommendation for the next round: build the minimum database skeleton before login UI so table shape, migrations, ownership boundaries, and version rules are stable first.

## Round 21 Verification
- `npm test`: passed, 10 tests.
- `npm run lint`: passed.
- `npm run build`: passed; build output still includes `/api/travel-plans/compare` and `/api/travel-plans/generate`, with no new account or history routes.
- `npx tsc --noEmit`: passed.
- Documentation review confirmed `docs/10-account-history-design.md` describes saved history and version history as future design only, not as current beta capability.

## Round 21 Record Time
- Date: 2026-06-08
- Stage: MVP design round 21

# Project State - MVP Round 20
## Round 20 Current State
- Round 20 adds lightweight plan comparison and itinerary optimization suggestions after a main trip plan has already been generated.
- The existing `POST /api/travel-plans/generate` request/response contract remains unchanged.
- A new independent `POST /api/travel-plans/compare` route accepts the current `TripPlan` and returns `{ ok: true, data: TravelPlanComparison }`; failures use `{ ok: false, error: { code, message, requestId } }`.
- Boundaries kept in this round:
  - No database, login, maps, weather, online search, ticketing, hotel integration, version history, saved history, or real data API.
  - No real-time, accurate, official, or guaranteed claims for AI output.
  - Comparison results are not added to the existing Markdown export.
  - No real server IP, API Key, Bearer, Authorization, full provider URL, or raw provider response is exposed.
  - No `.env`, `.env.local`, or real secret is committed.
  - No git commit has been made.

## Round 20 Implementation
- Added `TravelPlanComparisonSchema` and `TravelPlanComparisonRequestSchema`.
  - Variants are limited to 2-3 items.
  - Each variant includes name, style, suitable audience, advantages, trade-offs, 1-5 scores for budget/pace/attraction density, and core daily summaries.
  - Optimization includes pace tightness, budget risks, schedule conflicts, replacement ideas, and manual confirmation items.
- Added the server comparison generation chain.
  - Mock mode returns stable variants: `轻松舒适`, `预算友好`, and `景点丰富`.
  - OpenAI-compatible mode uses a server prompt, `parseAiJson`, Zod validation, and one retry after JSON/schema failure.
  - The server overwrites `source`, `generatedAt`, and `basePlanId`, and checks that each variant covers every current trip day.
- Added current-session frontend display.
  - The comparison entry appears only after the main plan succeeds.
  - Regenerating the main plan clears the previous comparison.
  - Comparison state is React page state only; no persistence or history is introduced.

## Round 20 Verification
- `npm test`: passed, 10 tests.
- `npm run lint`: passed.
- `npm run build`: passed; build output includes `/api/travel-plans/compare` and `/api/travel-plans/generate`.
- `npx tsc --noEmit`: passed.
- New test coverage checks comparison schema acceptance, stable mock variants, 1-5 score ranges, daily summaries, mock service generation, and compare API `BAD_REQUEST` behavior.

## Round 20 Post-Review Fix
- Review found one P2 documentation-order issue: the Round 20 status record was appended after older rounds, so the file still opened on Round 19.
- Fixed by moving the complete Round 20 record to the top of `docs/08-project-state.md`; no product code, API, schema, provider, export, print, storage, login, map, weather, search, or history behavior was changed.
- Post-fix verification passed:
  - `npm test`, `npm run lint`, `npm run build`, and `npx tsc --noEmit` all passed after the documentation move.
  - Mock API smoke passed for single-plan generation and comparison generation; the comparison returned 3 variants and optimization/manual confirmation items.
  - Browser smoke on a local mock service passed for single-plan generation, comparison generation, Markdown copy fallback, Markdown download feedback, and print/save-PDF feedback.
  - OpenAI-compatible live smoke was not rerun because the current shell environment did not expose `AI_API_KEY`, `AI_MODEL`, or `AI_CHAT_COMPLETIONS_URL`; the existing server-side provider path and schema validation remain unchanged, and no `.env.local` secret values were read or recorded.

## Round 20 Record Time
- Date: 2026-06-08
- Stage: MVP coding round 20

# 项目状态记录 - MVP 编码阶段第 19 轮

## 第 19 轮当前状态

- 本轮定位为导出体验增强：在现有“复制全文”和“下载 Markdown”基础上新增“打印 / 保存 PDF”入口。
- 本轮实现仅使用浏览器原生打印能力，点击后调用 `window.print()`；“保存 PDF”依赖用户浏览器打印对话框能力。
- 本轮不包装为精确排版 PDF，不实现服务端 PDF 生成，不新增后端 route，不接数据库。
- 本轮继续保持边界：
  - 未改变 `POST /api/travel-plans/generate`。
  - 未修改请求/响应 schema、`TripPlan` 类型、provider 选择逻辑或 mock provider。
  - 未新增数据库、登录、地图、天气、搜索、版本历史、方案对比或行程优化。
  - 未暴露真实服务器 IP、API Key、Bearer、Authorization、完整 provider URL 或原始 provider 响应。
  - 未提交 `.env`、`.env.local` 或任何真实密钥。
  - 未执行 git commit。

## 第 19 轮实现结果

- `src/components/trip/result-actions.tsx`：
  - 导出操作区新增“打印 / 保存 PDF”按钮。
  - 点击按钮时调用浏览器 `window.print()`。
  - 浏览器不支持打印能力时显示保守错误提示。
  - 导出区文案更新为可复制全文、下载 Markdown，或使用浏览器打印/保存 PDF；同时强调当前内容仍是 AI 旅行计划草稿，实时或易变信息需出发前人工确认。
  - 复制全文和下载 Markdown 仍复用原有实现，未修改 Markdown formatter。
- `src/app/page.tsx` 与 `src/components/trip/trip-plan-result.tsx`：
  - 为站点头部、表单、目的地推荐、生成状态区、结果预览占位、导出操作区和开发 JSON 预览补充打印隐藏标记。
  - 为旅行计划结果主体补充打印根标记，便于打印时聚焦结果内容。
- `src/app/globals.css`：
  - 新增 `@media print` 样式。
  - 打印时隐藏表单、推荐区、按钮、操作反馈、手动复制区域和开发调试内容。
  - 打印时结果区全宽展示，背景改为白色，移除阴影。
  - 对结果区的 section、article 和列表项设置分页友好样式，尽量避免卡片明显截断。
  - 使用 `@page` 设置基础页边距，不承诺精确排版 PDF。

## 第 19 轮验证结果

- 自动化命令已全部通过：
  - `npm test`：已通过，7 个测试全部 pass。
  - `npm run lint`：已通过。
  - `npm run build`：已通过。
  - `npx tsc --noEmit`：已通过。
- mock 模式复验已通过：
  - 使用本地临时生产服务和 `AI_PROVIDER=mock` 验证首页与 API smoke。
  - 合法 API 返回 HTTP 200、`ok=true`、`source.provider=mock`、`source.kind=mock`，天数一致，五类用户自行确认事项齐全；响应未命中敏感泄露模式。
  - 浏览器页面流可提交默认合法表单，成功后展示完整结果和 `mock 草稿`。
  - “复制全文”“下载 Markdown”“打印 / 保存 PDF”三个入口均可见。
  - 点击“复制全文”后出现复制成功或手动复制兜底反馈。
  - 点击“下载 Markdown”后出现下载反馈，原有下载能力未受影响。
  - 点击“打印 / 保存 PDF”后确认调用 `window.print()`。
  - 在 print media 下确认表单、目的地推荐、按钮和开发 JSON 预览被隐藏；完整结果、基本信息、每日行程、用户自行确认事项和免责声明保持可见。
- 真实 AI 模式复验已通过：
  - 使用本地已有服务端环境变量启动临时生产服务，未记录真实密钥、完整 provider URL 或原始 provider 响应。
  - 合法 API 返回 HTTP 200、`ok=true`、`source.provider=openai-compatible`、`source.kind=ai`，天数一致，五类用户自行确认事项齐全；响应未命中敏感泄露模式。
  - 浏览器页面流可提交默认合法表单，成功后展示真实 `AI 草稿` 和 `OpenAI-compatible` 来源标签。
  - “复制全文”“下载 Markdown”“打印 / 保存 PDF”三个入口均可见。
  - 复制、下载反馈均可见，原有复制与 Markdown 下载能力未受影响。
  - 点击“打印 / 保存 PDF”后确认调用 `window.print()`。
  - 在 print media 下确认表单、目的地推荐、按钮和开发 JSON 预览被隐藏；完整结果、基本信息、每日行程、用户自行确认事项和免责声明保持可见。
  - 页面与 API 摘要复验未发现 API Key、Bearer、Authorization、完整 provider URL 或原始 provider 响应泄露。
- 本轮复验使用的本地临时服务端口已清理；未新增依赖，未新增测试文件，未修改 `.env.local`。

## 第 19 轮审查后修复记录

- 审查结论为通过，无 P0/P1/P2 功能问题。
- 本次修复仅处理审查提出的非阻塞文档口径建议：
  - 将 README、发布检查清单和规划文档中的旧“PDF 导出未实现”口径更新为当前真实状态。
  - 当前支持浏览器打印/保存 PDF。
  - 当前仍不支持服务端 PDF 导出或精确排版 PDF。
- 本次修复未修改功能代码、API route、schema、provider、mock provider 或 Markdown formatter。
- 本次修复未新增数据库、登录、地图、天气、搜索、版本历史、方案对比或行程优化。
- 本次修复未写入真实服务器 IP、API Key、Bearer、Authorization、完整 provider URL 或原始 provider 响应。
- 审查后修复验证命令已全部通过：
  - `npm test`：已通过，7 个测试全部 pass。
  - `npm run lint`：已通过。
  - `npm run build`：已通过。
  - `npx tsc --noEmit`：已通过。

## 记录时间

- 日期：2026-06-08
- 阶段：MVP 编码阶段第 19 轮

# 项目状态记录 - MVP 编码阶段第 18 轮

## 第 18 轮当前状态

- 本轮定位为测试版发布与发布后回归验收、隐私检查和回滚预案记录，未实现新产品功能。
- 测试版发布口径已确认：`Beta` / `测试版` / `AI 草稿` / `需人工确认`。
- 本轮不包装为稳定正式版，不承诺实时、准确、官方价格或保证结果。
- 测试版访问地址统一记录为 `[测试版访问地址]`；真实 AI 服务统一记录为 `[真实 AI Provider]`。
- 本轮计划复验现有线上测试部署，不重跑部署脚本，不主动重建或升级镜像。
- 用户已提供真实线上测试入口供本轮私下复验；文档和输出继续仅记录 `[测试版访问地址]`，不记录真实服务器 IP。
- 截至本轮记录时，测试版主要线上回归已通过，线上容器/服务日志隐私检查已完成，第 18 轮测试版发布后验收已闭环。
- 本轮继续保持边界：
  - 未改变 `POST /api/travel-plans/generate`。
  - 未修改核心业务逻辑。
  - 未删除 mock provider。
  - 未实现数据库、登录、地图、天气、搜索、PDF、版本历史、方案对比或行程优化。
  - 未提交 `.env`、`.env.local` 或任何真实密钥。
  - 未执行 git commit。

## 第 18 轮已完成的本地检查

- 工作区进入本轮时为干净状态，`git status --short` 无输出。
- 已检查仓库公开文档、脚本、源码和当前环境变量名，未发现可直接用于本轮线上验收的真实访问地址。
- 本机存在系统 Edge 浏览器，可用于后续临时浏览器自动化；项目未新增 Playwright 或其他浏览器自动化依赖。
- 已确认 `.env.local`、`.env`、`.next`、`node_modules`、`.next-dev-log`、`tsconfig.tsbuildinfo` 和 `next-env.d.ts` 均被 `.gitignore` 覆盖。
- 已执行仓库敏感模式摘要扫描：
  - 未在源码、文档、测试或 `.env.local.example` 中发现真实 API Key。
  - `Authorization`、`Bearer` 和 `NEXT_PUBLIC_AI_API_KEY` 命中项为安全说明文字、环境变量名或服务端 header 构造代码。
  - `package-lock.json` 中存在非业务密钥形态的依赖文本命中，不属于项目 API Key 配置。
  - IPv4 形态命中为本地/保留地址、示例地址或 SVG 资源数字数据，未记录真实服务器 IP。

## 第 18 轮线上验收状态

- 部署服务运行状态：`[测试版访问地址]` 首页返回 HTTP 200，包含 `TraceMe Next` 应用标识，页面响应未命中敏感泄露模式。
- 线上首页桌面端 smoke test：已通过。1440px 桌面视口可访问首页，表单和目的地灵感区可见，初始态未发现横向溢出或敏感信息泄露。
- 线上首页移动端 smoke test：已通过。390px 移动视口可访问首页，表单和目的地灵感区可见，未发现明显横向溢出、脚本错误或敏感信息泄露。
- 线上真实 AI 完整生成流程：已通过。
  - 表单填写成功。
  - 推荐目的地点击后可回填目的地输入框。
  - 提交后观察到生成中状态。
  - 生成成功后展示完整结果，结果标记为 `AI 草稿`。
  - 页面展示用户自行确认事项和免责声明。
  - 点击“复制全文”后出现成功反馈；仪器化剪贴板复验确认 Markdown 全文非空，包含每日行程、用户自行确认事项和免责声明，且未出现 `undefined` 或 `null`。
  - 点击“下载 Markdown”后出现下载反馈，临时下载目录中 `.md` 文件非空；下载文件随后已清理。
- 线上合法 API 验收：已通过。合法请求返回 HTTP 200、`ok=true`、`source.provider=openai-compatible`、`source.kind=ai`、`input.days=3`、`dailyItinerary.length=3`，天数一致，`userVerifyItems` 覆盖 `ticketReservation`、`openingHours`、`hotelPrice`、`transportSchedulePrice`、`weather` 五类；响应未命中敏感泄露模式。
- 线上非法 API 验收：已通过。非法请求返回 HTTP 400、`ok=false`、`error.code=BAD_REQUEST`，包含 `requestId`；错误响应未命中 API Key、`Bearer`、`Authorization`、`api-key` 或堆栈泄露模式。
- 页面承诺文案检查：当前源码、线上页面和文档继续以测试版、AI 草稿、参考信息和出发前自行确认为主要口径，未发现将 AI 输出承诺为实时、准确、官方价格或保证结果。
- 线上容器/服务日志隐私检查：已通过。1Panel 中 `traceme-next-traceme-next-1` 容器日志仅包含 Next.js 版本、Local/Network 启动摘要和 Ready 状态；未发现真实服务器公网 IP、真实 API Key、真实 Provider 名称、Authorization、Bearer、api-key 或堆栈泄露。

## 第 18 轮回滚预案

- 如仅需下线测试版：在服务器项目目录执行 `docker compose stop` 或 `docker compose down`。
- 如后续为修复阻塞问题发生过重建：先记录修复前 commit 或镜像摘要；回滚时切回上一已知可用 commit，重新执行 `docker compose build && docker compose up -d`，再对 `[测试版访问地址]` 执行 smoke test。
- 回滚记录只写操作摘要、占位访问地址和结果，不写真实服务器 IP、真实 API Key、真实 Provider 名称、Authorization、Bearer token 或原始日志。

## 第 18 轮验证结果

- `npm test`：已通过，7 个测试全部 pass。
- `npm run lint`：已通过。
- `npm run build`：已通过。
- `npx tsc --noEmit`：单独重跑已通过。本轮曾在 `npm run build` 并行生成 `.next/types` 时触发一次临时缺文件错误，build 完成后重跑通过，最终验收以单独重跑结果为准。

## 第 18 轮发布判断

- 是否已测试版发布：已作为测试版在 `[测试版访问地址]` 可访问；不包装为稳定正式版。
- 发布后线上验收结果：已通过，包括首页桌面/移动 smoke、真实 AI 生成流程、复制全文、下载 Markdown、合法 API、非法 API 和线上容器/服务日志隐私检查。
- 是否发现敏感信息泄露：本地 git 跟踪文件、本地文案、线上页面响应、线上合法 API 响应、线上非法 API 响应和线上容器/服务日志均未发现真实密钥、真实服务器公网 IP、真实 Provider 名称、Authorization、Bearer token、api-key 或堆栈泄露。
- 是否发现产品阻塞问题：未发现新的 P0/P1 产品阻塞问题。
- 回滚预案：已记录。
- 是否建议继续公开测试：建议继续小范围测试版公开试用；不建议包装为稳定正式版，也不建议在测试反馈不足前扩大为大范围公开测试。

## 第 18 轮审查后修复尝试

- 审查结论为不通过，P0 原因为第 18 轮发布后线上验收缺少实际访问入口和服务器日志入口，不能证明测试版已发布并通过回归。
- 用户已补充真实线上测试入口；本轮使用真实入口完成线上主要回归，但文档和输出继续只记录 `[测试版访问地址]`，不记录真实服务器 IP、真实 API Key、真实 Provider 名称或 Authorization 信息。
- 当前可修复范围内无需修改源码、API 或核心业务逻辑；未新增数据库、登录、地图、天气、搜索、PDF、版本历史、方案对比或行程优化。
- 线上首页桌面端、移动端、真实 AI 生成流程、复制全文、下载 Markdown、线上合法 API 和线上非法 API 已补跑通过。
- 线上日志隐私检查已补跑通过：1Panel 容器日志仅包含非敏感启动摘要，未发现真实服务器公网 IP、真实 API Key、真实 Provider 名称、Authorization、Bearer、api-key 或堆栈泄露。
- 审查后本地复验已完成：敏感模式命中项仍为安全说明文字、环境变量名、服务端 header 构造代码、本地/示例地址或静态资源数字数据，未发现可确认的真实服务器 IP、真实 API Key、真实 Provider 名称或 Authorization 值泄露。
- 审查后质量命令已重新通过：`npm test`、`npm run lint`、`npm run build`、`npx tsc --noEmit`。
- 当前第 18 轮状态为：测试版发布后线上回归、隐私检查和回滚预案记录已完成；建议继续小范围测试版公开试用，不包装为稳定正式版。

## 记录时间

- 日期：2026-06-08
- 阶段：MVP 编码阶段第 18 轮

# 项目状态记录 - MVP 编码阶段第 17 轮

## 第 17 轮当前状态

- 本轮定位为正式发布前人工产品验收、隐私脱敏检查和发布口径确认，未实现新产品功能。
- 测试对象：`[测试部署 URL]`。
- 目标 provider：`[真实 AI Provider]`，页面和 API 仅记录 provider 类型 `openai-compatible`，不记录真实服务商敏感信息。
- 本轮继续保持边界：
  - 未改变 `POST /api/travel-plans/generate`。
  - 未修改核心业务逻辑。
  - 未删除 mock provider。
  - 未实现数据库、登录、地图、天气、搜索、PDF、版本历史、方案对比或行程优化。
  - 未修改 `.env`、`.env.local` 或提交任何密钥。
  - 未执行 git commit。

## 第 17 轮人工浏览器验收结果

- 桌面端验收通过：
  - 首页可访问，页面包含 `TraceMe Next` 应用标识。
  - 表单可填写，目的地输入、出发地、日期、人数和预算均可编辑。
  - 目的地推荐共展示 4 项，点击推荐项后可回填目的地输入框。
  - 清空目的地后提交会显示清晰的表单校验提示。
  - 提交真实 AI 生成后，生成按钮进入 disabled/loading 状态，随后进入成功状态并展示完整结果。
  - 真实 AI 结果可完整展示，包含每日行程、景点、餐饮、住宿、交通、预算、准备清单、风险提醒、用户自行确认事项和免责声明。
  - 结果来源为 `openai-compatible`，结果类型为 `AI 草稿`。
  - 页面可见出发前自行确认提醒。
  - 点击“复制全文”后出现成功反馈。
  - 点击“下载 Markdown”后触发 `.md` 文件下载，下载文件非空。
  - 桌面初始态和生成结果态均未发现横向溢出。
- 移动端首页/表单验收通过：
  - 390px 宽度下首页可访问，表单可填写。
  - 移动端初始态未发现明显重叠或横向溢出。
  - 审查后使用 `[本地验证 URL]` 生产构建 mock 路径补跑移动端生成结果态：结果结构可见、复制/下载操作区可见，390px 视口 `scrollWidth` 等于视口宽度，未发现横向溢出或脚本错误。
- API 结构辅助验收通过：
  - 合法请求返回 HTTP 200、`ok=true`。
  - `source.provider=openai-compatible`，`source.kind=ai`。
  - 3 天请求返回 3 天行程，天数一致。
  - `userVerifyItems` 覆盖 `ticketReservation`、`openingHours`、`hotelPrice`、`transportSchedulePrice`、`weather` 五类。
- 浏览器自动化未捕捉到 console error 或 page error。

## 第 17 轮发布文案与隐私脱敏结果

- 发布文案检查通过：
  - 页面未将 AI 输出承诺为实时、准确、官方价格或保证结果。
  - 页面继续以 AI 草稿、参考信息和出发前自行确认为主要口径。
  - 当前 MVP 未被描述为可保存历史或具备数据库持久化能力。
  - 文案中出现的“实时”等词仅用于提醒用户自行核对信息或说明推荐不代表实时热度，不构成产品承诺。
- 隐私脱敏检查通过：
  - `docs/08-project-state.md` 中真实测试 URL、公开测试 IP 和真实 AI 服务商名称已替换为占位符。
  - git 跟踪文件扫描未发现公开真实 IP。
  - git 跟踪文件扫描未发现真实 API Key 或 `sk-` 形态密钥。
  - `API Key`、`Authorization`、`Bearer`、`api-key` 等命中项均为安全说明文字、环境变量名或服务端正常构造 header 的代码，不包含真实值。
  - 未修改 `.env`、`.env.local`，未提交密钥。

## 第 17 轮发布前可接受性判断

- 当前无持久化：接受，仅作为测试版发布；刷新后不保存历史属于已知 MVP 限制。
- 当前无正式域名、HTTPS 和反向代理：接受，仅作为测试版发布；不包装为正式稳定生产环境。
- 当前页面布局和核心交互质量：接受，人工验收未发现 P0/P1 产品体验问题。
- 当前发布口径：建议进入测试版发布，不建议对外描述为稳定正式版。
- 发布阻塞问题：未发现 P0/P1 发布阻塞问题。

## 第 17 轮验证结果

- `npm test`：已通过。
- `npm run lint`：已通过。
- `npm run build`：已通过。
- `npx tsc --noEmit`：已通过。

## 第 17 轮审查后修复记录

- 修复范围仅限发布前验收记录和脱敏口径，不修改源码、API、核心业务逻辑或环境文件。
- 已将历史本地生产构建、dev server 和 mock 验证记录中的本地地址占位统一为 `[本地验证 URL]`，避免与线上 `[测试部署 URL]` 混用。
- 已补跑移动端生成结果态布局验收：使用 `[本地验证 URL]` 的生产构建 mock 路径验证结果结构、复制/下载操作区和 390px 视口横向溢出，未发现重叠、横向溢出或脚本错误。
- 继续确认本轮未写入真实服务器 IP、真实 API Key、真实 Authorization、Bearer token 或真实 AI 服务商敏感信息。

## 记录时间

- 日期：2026-06-07
- 阶段：MVP 编码阶段第 17 轮

# 项目状态记录 - MVP 编码阶段第 16 轮

## 第 16 轮当前状态

- 本轮定位为云服务器 Docker Compose 测试部署与线上 smoke test，未实现新产品功能。
- 实际部署状态：云服务器测试部署已完成，测试部署 URL 为 `[测试部署 URL]`。
- 目标部署模式：`AI_PROVIDER=openai-compatible`。
- 目标 provider 形态：服务端 `AI_CHAT_COMPLETIONS_URL` 指向中转站 `/v1/responses` endpoint，服务端 `AI_MODEL` 使用当前 [真实 AI Provider] 测试模型值。
- 本轮未记录、输出、提交或写入任何真实 API Key 或 `.env` 内容；仅记录公开测试部署 URL、脱敏 endpoint 形态和非敏感 smoke 摘要。
- 本轮继续保持边界：
  - 未改变 `POST /api/travel-plans/generate`。
  - 未修改核心业务逻辑。
  - 未删除 mock provider。
  - 未实现数据库、登录、地图、天气、搜索、PDF、版本历史、方案对比或行程优化。
  - 未执行 git commit。

## 第 16 轮已执行检查

- 本地工作区进入本轮时为干净状态：`git status --short --branch` 显示 `## main...origin/main`。
- 本地 Docker CLI 与 Docker Compose 插件可用：
  - `docker --version` 可返回版本。
  - `docker compose version` 可返回版本。
- 本地 Docker daemon 当前不可用，`docker info` 无法连接 Docker Desktop Linux engine；这不是云服务器验证结果。
- `node --check scripts/smoke-travel-api.mjs` 已通过，smoke 脚本语法可解析。
- 已复核 `openai-compatible` provider 支持 `/v1/responses` 形态；当配置 URL 路径以 `/responses` 结尾时会走 Responses 请求体。
- 已执行仓库敏感模式扫描，命中项为安全说明文字和服务端正常构造 `Authorization` header 的代码位置；未发现真实 API Key 值。

## 第 16 轮线上复验结果

- Docker Compose 状态：服务器 `docker compose ps` 显示 `traceme-next-traceme-next-1` 使用 `traceme-next:latest` 运行中，端口为 `0.0.0.0:3000->3000/tcp` 和 `[::]:3000->3000/tcp`。
- 服务器环境变量状态：`.env` 存在，未发现 `NEXT_PUBLIC_*` AI 密钥；服务器 `.env` 和容器环境均确认 `AI_PROVIDER=openai-compatible`，`AI_API_KEY`、`AI_MODEL`、`AI_CHAT_COMPLETIONS_URL` 均为 set，未输出真实值。
- [真实 AI Provider] 最小连通性：容器内对 `https://[真实 AI Provider]/chat/completions` 的最小请求返回 HTTP 200、`ok=true`、耗时约 294ms。
- 首页 smoke：`[测试部署 URL]` 返回 HTTP 200，包含 `TraceMe Next` 应用标识，页面响应未命中敏感泄露模式。
- 线上合法 API smoke：`POST /api/travel-plans/generate` 返回 HTTP 200、`ok=true`、`source.provider=openai-compatible`、`source.kind=ai`。
- 行程结构 smoke：`input.days=3`，`dailyItinerary.length=3`，天数一致；`userVerifyItems` 覆盖 `ticketReservation`、`openingHours`、`hotelPrice`、`transportSchedulePrice`、`weather` 五类。
- 错误响应敏感信息扫描：非法请求返回 HTTP 400、`ok=false`、`error.code=BAD_REQUEST`，包含 `requestId`，未命中 API Key、`Bearer`、`Authorization` 或堆栈泄露模式。
- 项目自带 smoke 脚本已对线上 URL 通过：`node scripts/smoke-travel-api.mjs --base-url [测试部署 URL] --expect-provider openai-compatible`。

## 第 16 轮修复过程摘要

- 一键部署最初失败：GitHub `main` raw 脚本默认使用 SSH 仓库地址，云服务器没有 GitHub public key，报 `Permission denied (publickey)`。
- 已修复并推送 GitHub `main`：`e6dea21 Fix Docker Compose deploy clone URL`，默认仓库地址改为 `https://github.com/KECIHH/traceme-next.git`，保留 `TRACEME_REPO_URL` 覆盖能力。
- 初次线上 API 返回 `provider=mock`、`kind=mock`；后续确认 `.env` 和容器环境均已进入 `openai-compatible`。
- 真实 provider 初次调用返回 HTTP 502、`AI_PROVIDER_ERROR`；容器日志显示 `[真实 AI Provider]` timeout，且 endpoint 形态为 `other`。
- 已将服务器 `.env` 的 `AI_CHAT_COMPLETIONS_URL` 调整为完整 Chat Completions endpoint，并将 `AI_REQUEST_TIMEOUT_MS` 调整为 `120000`；容器强制重建后，线上 openai-compatible smoke 通过。

## 第 16 轮发布建议

- 技术部署 smoke 已通过，可以进入正式发布前人工验收。
- 由于用户已反馈页面布局、目的地灵感交互、生成结果质量和刷新后不保存等体验问题，当前不建议直接面向正式用户发布；建议先完成产品/体验验收并决定是否接受这些 MVP 限制。

## 第 16 轮审查后修复

- 审查结论：不通过；已发现可在部署脚本和文档中修复的一键部署阻塞：默认仓库地址使用 SSH，导致未配置 GitHub SSH key 的云服务器执行一键部署时出现 `Permission denied (publickey)`。
- 已复核当前仓库和本机环境：
  - 工作区变更范围为部署脚本、部署文档、发布检查清单和 `docs/08-project-state.md`。
  - 未发现仓库内存在真实云服务器 URL、SSH 配置别名或可直接完成线上 smoke 的远程部署入口。
  - 本地 Docker CLI 与 Docker Compose 插件可用，但本地 Docker daemon 不可用；这仍不能替代云服务器 Docker daemon 验证。
- 本轮修复动作：
  - `scripts/deploy-docker-compose.sh` 默认仓库地址改为 `https://github.com/KECIHH/traceme-next.git`，避免公开仓库一键部署依赖服务器 GitHub SSH key。
  - 保留 `TRACEME_REPO_URL` 覆盖能力，私有仓库或 SSH 部署仍可自行指定仓库地址。
  - 当目标部署目录已存在但不是 git 仓库且非空时，脚本会明确报错，避免失败 clone 后的异常目录被误用。
  - README 和 `docs/09-release-checklist.md` 已同步默认 HTTPS 克隆口径。
  - 继续明确记录“未部署成功”和“缺少测试部署 URL”，避免把阻塞状态写成部署成功。
- 注意：服务器一键命令会从 GitHub `main` 分支读取 raw 脚本；本地修复需要进入 `main` 后，服务器重跑一键命令才会拿到新版 HTTPS 默认仓库地址。
- 服务器复测结果：继续执行 GitHub `main` raw 一键命令时仍报 `Permission denied (publickey)`，已确认远端 raw 脚本当前仍是旧版 SSH 默认仓库地址；因此本地修复尚未对服务器一键命令生效。
- 临时绕过方案：在服务器执行旧 raw 脚本时显式传入 `TRACEME_REPO_URL=https://github.com/KECIHH/traceme-next.git`；长期方案是将本地部署脚本修复提交并推送到 GitHub `main`。
- 已将部署脚本修复提交并推送到 GitHub `main`：`e6dea21 Fix Docker Compose deploy clone URL`；远端 raw 脚本已确认默认仓库地址为 HTTPS。
- 修复后复验状态：
  - 测试部署 URL：`[测试部署 URL]`。
  - 首页 smoke：HTTP 200，`content-type=text/html; charset=utf-8`，包含 `TraceMe Next` 应用标识，页面响应未命中敏感泄露模式。
  - 线上合法 API smoke 初次复验：HTTP 200，`ok=true`，`input.days=3`，`dailyItinerary.length=3`，天数一致，`userVerifyItems` 覆盖 `ticketReservation`、`openingHours`、`hotelPrice`、`transportSchedulePrice`、`weather` 五类，响应未命中敏感泄露模式；但部署模式不通过，预期 `source.provider=openai-compatible`、`source.kind=ai`，实际返回 `source.provider=mock`、`source.kind=mock`。
  - 服务器容器环境复核后再次复验：服务器 `.env` 与容器环境均显示 `AI_PROVIDER=openai-compatible`，`AI_API_KEY`、`AI_MODEL`、`AI_CHAT_COMPLETIONS_URL` 均为 set；线上合法 API 一度变为 HTTP 502、`ok=false`、`error.code=AI_PROVIDER_ERROR`、包含 `requestId`，响应未命中敏感泄露模式。
  - [真实 AI Provider] endpoint 修正后最终复验：项目自带 smoke 脚本通过；首页 HTTP 200；API HTTP 200、`ok=true`、`source.provider=openai-compatible`、`source.kind=ai`、天数一致、五类 `userVerifyItems` 齐全，响应未命中敏感泄露模式。
  - 错误响应敏感信息扫描：非法请求返回 HTTP 400、`ok=false`、`error.code=BAD_REQUEST`，包含 `requestId`，未命中 API Key、`Bearer`、`Authorization` 或堆栈泄露模式。
  - Docker Compose 启动：服务器 `docker compose ps` 显示 `traceme-next-traceme-next-1` 使用 `traceme-next:latest` 运行中，端口为 `0.0.0.0:3000->3000/tcp` 和 `[::]:3000->3000/tcp`。
  - 服务器 `.env` 检查：`.env` 存在，未发现 `NEXT_PUBLIC_*` AI 密钥；服务器 `.env` 和容器环境均已确认 `AI_PROVIDER=openai-compatible`，三项真实 provider 必需变量均为 set，未输出真实值。
- 当前判断：云服务器测试部署和线上 smoke test 已通过；正式发布前仍需人工确认是否接受当前 MVP 的无持久化、目的地灵感交互和页面布局/结果质量限制。
- 修复后发布建议：技术上可进入正式发布前人工验收；不建议在用户反馈的产品体验问题未处理或未确认接受前直接正式发布。

## 记录时间

- 日期：2026-06-07
- 阶段：MVP 编码阶段第 16 轮

# 项目状态记录 - MVP 编码阶段第 15 轮

## 第 15 轮当前状态

- 本轮定位为部署环境确认与部署验收，未实现新产品功能。
- 实际部署状态：未部署，只完成部署前验收。
- 目标部署形态：本地 Windows 生产模式验收 + 云服务器 Docker Compose 测试部署。
- 目标 AI 模式：以 `AI_PROVIDER=openai-compatible` 真实 [真实 AI Provider] 路径为主，同时保留并复验 `AI_PROVIDER=mock` 和 `openai-compatible` 缺配置错误路径。
- 当前工作区进入本轮前为干净状态：`git status --short --branch` 显示 `## main...origin/main`。
- 已确认 `.gitignore` 覆盖：
  - `.env.local` 命中 `.env*`。
  - `.next` 命中 `/.next/`。
  - `node_modules` 命中 `/node_modules`。
- 已确认 `.env.local.example` 只包含变量名和空值示例，未包含真实 API Key、真实模型名、真实 provider URL 或真实超时值。
- 本轮继续保持边界：
  - 未改变 `POST /api/travel-plans/generate`。
  - 未删除 mock provider。
  - 未实现数据库、登录、地图、天气、搜索、PDF、版本历史、方案对比或行程优化。
  - 未提交、打印、记录或展示任何真实 API Key。
  - 未提交 `.env.local`。

## 第 15 轮部署支持改动

- 已更新 `next.config.ts`：
  - 增加 `output: "standalone"`，用于 Docker 生产镜像。
  - 未修改核心业务逻辑、API route 或 provider 选择逻辑。
- 已新增 Docker Compose 部署文件：
  - `Dockerfile`：多阶段构建，使用 Next.js standalone 输出运行生产服务。
  - `.dockerignore`：排除 `.env*`、`.next`、`node_modules`、日志、coverage、git 元数据等不应进入镜像上下文的内容。
  - `docker-compose.yml`：声明服务、镜像构建、宿主机端口映射和服务端 AI 环境变量名；未写入真实值。
- 已新增部署与验收脚本：
  - `scripts/deploy-docker-compose.sh`：默认克隆/更新 `https://github.com/KECIHH/traceme-next.git`，必要时创建未提交的 `.env` mock 示例，执行 `docker compose build`、`docker compose up -d`，并运行 smoke test；私有仓库或 SSH 部署可通过 `TRACEME_REPO_URL` 覆盖。
  - `scripts/smoke-travel-api.mjs`：支持 `--base-url` 和 `--expect-provider mock|openai-compatible|missing-config`，验证首页和 `POST /api/travel-plans/generate`，只输出安全摘要。
- 已更新发布文档：
  - `README.md` 增加 Docker Compose 云服务器部署、一行部署命令、环境变量名清单和部署后 smoke test。
  - `docs/09-release-checklist.md` 更新为第 15 轮部署环境确认与部署验收口径，增加 Docker Compose 部署步骤和部署后 smoke test 标准。

## 第 15 轮验证结果

- 发布前命令检查：
  - `npm test` 已通过，7 个测试全部 pass。
  - `npm run lint` 已通过。
  - `npm run build` 已通过，并已生成 `.next/standalone`。
  - `npx tsc --noEmit` 已通过。
- 配置与安全检查：
  - `docker compose config` 已通过配置解析。
  - `node --check scripts/smoke-travel-api.mjs` 已通过。
  - `.env.local.example` 仍为空值示例。
  - 本轮未读取或输出 `.env.local` 的真实值；真实 AI 验收仅依赖 Next.js 生产服务加载本地环境。
  - README、docs、src、tests 和 `.env.local.example` 的敏感模式扫描未发现真实 API Key；命中项为安全说明文字或服务端 provider 中正常构造 `Authorization` header 的代码位置，需要发布前人工复核但当前未发现真实密钥值。
- 本地生产服务 smoke test：
  - `AI_PROVIDER=mock`：首页 HTTP 200；API HTTP 200；`ok=true`；`source.provider=mock`；`source.kind=mock`；`input.days=3`；`dailyItinerary.length=3`；天数一致；五类用户自行确认事项齐全；响应摘要未命中敏感泄露模式。
  - `AI_PROVIDER=openai-compatible` 缺配置：首页 HTTP 200；API HTTP 500；`ok=false`；`error.code=AI_PROVIDER_CONFIG_ERROR`；包含 `requestId`；响应摘要未命中敏感泄露模式。
  - 真实 `AI_PROVIDER=openai-compatible`：首页 HTTP 200；API HTTP 200；`ok=true`；`source.provider=openai-compatible`；`source.kind=ai`；`input.days=3`；`dailyItinerary.length=3`；天数一致；五类用户自行确认事项齐全；响应摘要未命中敏感泄露模式。
- Docker 本机验证：
  - 本机已安装 Docker CLI 和 Docker Compose 插件。
  - 当前 Docker daemon 未启动，`docker info` 无法连接 Docker Desktop Linux engine。
  - 因此本轮未能在本机执行 `docker compose build`、`docker compose up -d` 或容器内 smoke test；云服务器 Docker Compose 实际部署仍需在目标服务器执行后补充部署 URL 和 smoke 结果。

## 第 15 轮部署环境变量建议

- mock 部署：
  - `AI_PROVIDER=mock`
  - `AI_API_KEY` 留空。
  - `AI_MODEL` 留空。
  - `AI_CHAT_COMPLETIONS_URL` 留空。
  - `AI_REQUEST_TIMEOUT_MS` 留空或填写正整数毫秒值。
- 真实 AI 部署：
  - `AI_PROVIDER=openai-compatible`
  - `AI_API_KEY`：必填，只配置在服务器环境变量或服务器 `.env`。
  - `AI_MODEL`：必填。
  - `AI_CHAT_COMPLETIONS_URL`：必填，填写服务端完整 endpoint。
  - `AI_REQUEST_TIMEOUT_MS`：可选，留空时使用服务端默认值。
- Docker Compose 额外支持：
  - `APP_PORT`：控制宿主机端口，不是 AI 配置变量。

## 第 15 轮仍需用户确认

- 云服务器系统环境、Docker daemon 状态、仓库访问方式和目标部署目录。
- 真实部署域名或公网 URL。
- 云服务器 `.env` 中的真实服务端变量是否已配置完成。
- 实际执行一行部署命令后的部署 URL 和部署后 smoke test 结果。

## 第 15 轮发布建议

- 当前本地生产模式、mock 路径、缺配置错误路径和真实 `openai-compatible` 路径均已通过验收。
- Docker Compose 配置和部署脚本已补齐，但容器运行级验证因本机 Docker daemon 未启动而未完成。
- 建议进入云服务器测试部署；待目标服务器 `docker compose build/up` 和部署 URL smoke test 通过后，再建议正式发布。

## 第 15 轮审查后修复

- 审查结论：通过。
- 审查未列出 P0、P1 或 P2 问题；本次修复不修改业务代码、API route、provider、mock provider、schema、页面功能或部署脚本。
- 本次修复仅更新 `docs/08-project-state.md`，记录审查后处理结论与复验结果。
- 继续保持边界：
  - 未改变 `POST /api/travel-plans/generate`。
  - 未删除 mock provider。
  - 未实现数据库、登录、地图、天气、搜索、PDF、版本历史、方案对比或行程优化。
  - 未读取、打印、提交、记录或展示任何真实 API Key。
  - 未提交 `.env.local`。
- 审查后复验结果：
  - `npm test` 已通过，7 个测试全部 pass。
  - `npm run lint` 已通过。
  - `npm run build` 已通过。
  - `npx tsc --noEmit` 已通过。
  - 本地生产 `AI_PROVIDER=mock` smoke 已通过：首页 HTTP 200，API HTTP 200，`ok=true`，`source.provider=mock`，`source.kind=mock`，天数一致，五类用户自行确认事项齐全，响应摘要未命中敏感泄露模式。
  - 本地生产 `AI_PROVIDER=openai-compatible` 缺配置 smoke 已通过：首页 HTTP 200，API HTTP 500，`ok=false`，`error.code=AI_PROVIDER_CONFIG_ERROR`，包含 `requestId`，响应摘要未命中敏感泄露模式。
  - 本地生产真实 `AI_PROVIDER=openai-compatible` smoke 已通过：首页 HTTP 200，API HTTP 200，`ok=true`，`source.provider=openai-compatible`，`source.kind=ai`，天数一致，五类用户自行确认事项齐全，响应摘要未命中敏感泄露模式。
  - 当前没有真实部署 URL，因此未执行远程部署 URL smoke test。
- 发布建议保持不变：暂不建议正式发布到生产；建议先在云服务器完成 Docker Compose 测试部署，并对部署 URL 执行 smoke test。

## 记录时间

- 日期：2026-06-07
- 阶段：MVP 编码阶段第 15 轮

# 项目状态记录 - MVP 编码阶段第 14 轮

## 第 14 轮当前状态

- 本轮定位为 MVP 发布准备与交付清单，未实现新产品功能。
- 已阅读并核对：
  - `docs/08-project-state.md`
  - `README.md`
  - `package.json`
  - `.env.local.example`
  - `.gitignore`
  - 当前 `git status`
- 已按第 13 轮最新验收结果修正发布文档口径：
  - 当前 MVP 已通过 `AI_PROVIDER=mock` API 和页面复验。
  - 当前 MVP 已通过 `AI_PROVIDER=openai-compatible` 缺配置错误路径复验。
  - 当前 MVP 已通过真实 `AI_PROVIDER=openai-compatible` API 复验。
  - 旅行计划继续定位为草稿，实时或易变信息需用户自行确认。
- 已更新 `README.md`：
  - 包含项目简介、当前 MVP 能力、技术栈、本地启动方式、测试/检查命令。
  - 包含 `AI_PROVIDER=mock` 使用方式。
  - 包含 `AI_PROVIDER=openai-compatible` 环境变量说明。
  - 明确 API Key 只放服务端 `.env.local` 或部署平台服务端环境变量。
  - 明确当前未实现数据库、登录、地图、天气、搜索、PDF、版本历史、方案对比、行程优化等能力。
- 已新增 `docs/09-release-checklist.md`：
  - 覆盖发布前命令检查。
  - 覆盖 mock 模式验收。
  - 覆盖 openai-compatible 真实模式验收。
  - 覆盖缺配置错误路径验收。
  - 覆盖密钥泄露检查、已知限制和部署环境变量清单。
  - 记录第 14 轮开始时 staged / unstaged / untracked 文件归属。
- 已更新 `.env.local.example`：
  - 仅保留变量名和空值示例。
  - 未包含真实 API Key、真实模型名、真实 provider URL 或真实超时值。
- 已确认 `.gitignore` 覆盖不应提交内容：
  - `.env.local` 命中 `.env*`。
  - `.next` 命中 `/.next/`。
  - `node_modules` 命中 `/node_modules`。
  - `.next-dev-log`、`tsconfig.tsbuildinfo`、`next-env.d.ts` 也被忽略规则覆盖。

## 第 14 轮工作区改动归属

- 第 14 轮开始时 staged 文件：
  - `docs/08-project-state.md`
  - `package-lock.json`
  - `package.json`
  - `tests/core-contracts.test.ts`
  - 判断：归属第 13 轮测试、脚本和项目状态记录。
- 第 14 轮开始时 unstaged 文件：
  - `src/components/trip/result-actions.tsx`
  - `src/components/trip/trip-planner-form.tsx`
  - `src/lib/ai/build-trip-plan-prompt.ts`
  - `src/lib/ai/openai-compatible-provider.ts`
  - `src/lib/services/generate-trip-plan.ts`
  - 判断：归属历史功能、provider、prompt、UI 和生成链路改动，不归属第 14 轮发布文档准备。
- 第 14 轮开始时 untracked 文件：
  - 无。
- 第 14 轮新增或修改文件：
  - `README.md`
  - `.env.local.example`
  - `docs/09-release-checklist.md`
  - `docs/08-project-state.md`
- 本轮未执行 `git commit`。
- 本轮未修改核心业务逻辑，未改变 `POST /api/travel-plans/generate`，未删除 mock provider。

## 第 14 轮验证结果

- 发布前命令检查：
  - `npm test` 已通过，7 个测试全部 pass。
  - `npm run lint` 已通过。
  - `npm run build` 已通过。
  - `npx tsc --noEmit` 已通过。
- 密钥与忽略规则检查：
  - 未读取或输出 `.env.local` 内容。
  - `.env.local.example` 仅为空值示例。
  - `git check-ignore -v .env.local .next node_modules .next-dev-log tsconfig.tsbuildinfo next-env.d.ts` 已确认这些本地文件或目录被 ignore 覆盖。
  - README、docs、src、tests 和 `.env.local.example` 的敏感模式扫描未发现真实 API Key；命中项为安全说明文字或服务端 provider 中正常构造 `Authorization` header 的代码位置，需要发布前人工复核但当前未发现真实密钥值。

## 第 14 轮仍未实现

- 数据库。
- 用户登录。
- 地图。
- 天气。
- 联网搜索。
- PDF 导出。
- 版本历史。
- 保存历史或保存到笔记。
- 方案对比。
- 行程优化。
- 真实票价、酒店价格、门票、交通班次、天气等实时数据能力。
- 非 Chat Completions / Responses 兼容格式的第三方 Provider。

## 第 14 轮发布建议

- 当前静态检查、测试和生产构建已通过。
- 建议进入部署阶段前，由用户确认目标部署模式：
  - `AI_PROVIDER=mock`：适合演示、离线验收或无密钥部署。
  - `AI_PROVIDER=openai-compatible`：需要用户在部署平台配置服务端 `AI_API_KEY`、`AI_MODEL` 和 `AI_CHAT_COMPLETIONS_URL`。
- 建议部署前再次确认 `.env.local` 不进入 git，且部署平台环境变量没有填入前端可见的 `NEXT_PUBLIC_*` 密钥变量。

## 第 14 轮审查后修复

- 审查结论为通过，未发现 P0 或 P1 问题。
- 已修复审查提出的 P2 文档一致性问题：
  - 清理文档底部旧“下一步建议”中仍暗示真实 `AI_PROVIDER=openai-compatible` 尚未验收的过期说法。
  - 将底部建议更新为当前第 14 轮发布阶段口径：先确认部署模式，再按发布检查清单完成目标环境验收。
- 本次修复仅修改 `docs/08-project-state.md`，未修改 README、发布清单、环境变量示例、核心业务逻辑、API route、provider、mock provider 或前端功能。
- 本次修复未实现数据库、登录、地图、天气、搜索、PDF、版本历史、方案对比或行程优化。

## 记录时间

- 日期：2026-06-07
- 阶段：MVP 编码阶段第 14 轮

# 项目状态记录 - MVP 编码阶段第 13 轮

## 第 13 轮当前状态

- 本轮定位为 MVP 发布前稳定性打磨与基础测试，未新增产品大功能。
- 已检查 `package.json` scripts 和依赖：
  - 当前沿用轻量测试方案：`node --test` + `tsx`。
  - `npm test` 已配置为 `node --import tsx --test "tests/**/*.test.ts"`。
  - 未引入 Jest、Vitest 或其他更重测试框架。
- 已检查核心纯函数/契约测试：
  - `GenerateTripPlanRequestSchema` 覆盖合法输入和非法输入。
  - `TripPlanSchema` 覆盖 `input.days` 与日期范围一致、`dailyItinerary.length` 与天数一致。
  - `TripPlanSchema` 覆盖 `userVerifyItems` 必须包含 `ticketReservation`、`openingHours`、`hotelPrice`、`transportSchedulePrice`、`weather` 五类。
  - `parseAiJson` 覆盖标准 JSON 和 ```json 代码块 JSON。
  - `formatTripPlanMarkdown` 覆盖基本信息、每日行程、用户自行确认事项、免责声明，并确认不输出 `undefined` 或 `null` 字面量。
  - `getBudgetSummary` 覆盖 `budget.scope=total` 和 `budget.scope=perPerson` 的总预算/人均预算口径。
- 已检查前端错误文案：
  - `src/lib/services/travel-plan-client.ts` 会将服务端错误码映射为用户友好中文提示。
  - `src/app/page.tsx` error 状态只展示映射后的前端文案。
  - 前端不展示 provider 原始响应、完整 URL、Authorization header、Bearer、API key、堆栈或底层异常对象。
- 本轮未改变以下边界：
  - 未改变 `POST /api/travel-plans/generate`。
  - 未删除或替换 mock provider。
  - 未修改 `.env.local` 或 `.env.local.example`。
  - 未打印、提交、记录或暴露真实 `AI_API_KEY`、Authorization header、完整服务 URL、模型名、完整 prompt 或原始 AI 响应。
  - 未实现数据库、登录、地图、天气、联网搜索、PDF、版本历史、保存历史、方案对比或行程优化。

## 第 13 轮验证结果

- 静态与单元测试：
  - `npm test` 已通过，7 个测试全部 pass。
  - `npm run lint` 已通过。
  - `npm run build` 已通过。
  - `npx tsc --noEmit` 已通过。
- `AI_PROVIDER=mock` API 复验已通过：
  - 使用生产构建临时服务和临时进程环境覆盖为 mock。
  - 合法 3 天厦门旅行计划请求返回 HTTP 200、`ok: true`。
  - 响应为 `source.provider=mock`、`source.kind=mock`。
  - `input.days=3`，`dailyItinerary.length=3`。
  - `userVerifyItems` 五类齐全。
- `AI_PROVIDER=openai-compatible` 缺配置错误路径复验已通过：
  - 使用临时进程环境将 provider 必需配置置空，不修改 `.env.local`。
  - 合法业务请求返回 HTTP 500、`ok: false`、`error.code=AI_PROVIDER_CONFIG_ERROR`，且包含 `requestId`。
  - 错误响应未匹配到密钥、Bearer、Authorization、`AI_API_KEY`、完整 URL、api-key 或堆栈泄漏特征。
- 真实 `AI_PROVIDER=openai-compatible` API 复验已通过：
  - 当前 `.env.local` 存在，且必需变量名齐全；本轮只确认变量名存在，未输出变量值。
  - 使用生产构建临时服务发起真实 provider 调用。
  - 合法 3 天厦门旅行计划请求返回 HTTP 200、`ok: true`。
  - 响应为 `source.provider=openai-compatible`、`source.kind=ai`。
  - `input.days=3`，`dailyItinerary.length=3`。
  - `userVerifyItems` 五类齐全。
  - 响应摘要检查未匹配到密钥、Bearer、Authorization、`AI_API_KEY`、完整 URL、api-key 或堆栈泄漏特征。
- Browser 布局与错误状态复验已通过：
  - 桌面视口打开 mock 生产服务，首页可见 `迹遇 Next`，`scrollWidth` 等于 `clientWidth`。
  - 桌面视口提交默认合法表单后进入 `已生成草稿`，完整结果、基本信息、每日行程、用户自行确认事项、免责声明、复制全文、下载 Markdown 和本地 mock 来源均可见，无横向溢出。
  - 移动端 390px 视口下，首页和成功结果页关键区块均可见，`scrollWidth` 等于 `clientWidth`，未发现明显横向溢出或文本重叠。
  - 缺配置错误页面提交后显示 `生成失败` 和“服务端 AI 配置暂时不可用，请稍后再试。”，未匹配到密钥、Authorization、完整 URL、api-key 或堆栈泄漏特征。

## 第 13 轮仍未实现

- 数据库。
- 用户登录。
- 地图。
- 天气。
- 联网搜索。
- PDF 导出。
- 版本历史。
- 保存历史或保存到笔记。
- 方案对比。
- 行程优化。
- 真实票价、酒店价格、门票、交通班次、天气等实时数据能力。
- 非 Chat Completions / Responses 兼容格式的第三方 Provider。

## 第 13 轮审查后修复

- 审查结论为通过，未发现 P0、P1 或阻塞性 P2 代码问题。
- 已按审查提醒处理发布前版本控制纳入事项：
  - 将第 13 轮测试、脚本和状态记录相关文件纳入 git index：`tests/core-contracts.test.ts`、`package.json`、`package-lock.json`、`docs/08-project-state.md`。
  - 未将无关源码改动混入本轮 staging 范围。
- 本次审查后修复未修改业务代码、schema、provider、API route、Markdown formatter 或前端 UI。
- 继续保持边界：
  - 未改变 `POST /api/travel-plans/generate`。
  - 未删除 mock provider。
  - 未暴露或记录任何真实 API Key。
  - 未实现数据库、登录、地图、天气、搜索、PDF、版本历史、方案对比或行程优化。

## 记录时间

- 日期：2026-06-07
- 阶段：MVP 编码阶段第 13 轮

# 项目状态记录 - MVP 编码阶段第 12 轮

## 第 12 轮当前状态

- 真实 `AI_PROVIDER=openai-compatible` 端到端验收已通过，继续修复后的最终复验也已通过：
  - 根目录已存在 `.env.local`，且必需变量名齐全。
  - 未打印、提交、记录或暴露真实 `AI_API_KEY`、Authorization header、完整服务 URL、模型名、完整 prompt 或原始 AI 响应。
  - 使用生产构建临时服务实际发起真实 provider 调用，接口返回 HTTP 200、`ok: true`。
  - 成功响应中 `source.provider` 为 `openai-compatible`，`source.kind` 为 `ai`。
  - 成功响应中 `input.days` 为 3，`dailyItinerary.length` 为 3。
  - `userVerifyItems` 覆盖 `ticketReservation`、`openingHours`、`hotelPrice`、`transportSchedulePrice`、`weather` 五类。
- 已确认真实 AI 输出进入服务端校验链路：
  - `openai-compatible` provider 只返回 raw text。
  - `generateTripPlan` 继续执行 `parseAiJson(rawTripPlan)`。
  - 服务端覆盖 `id`、`generatedAt`、`generationMode`、`source` 和 `input`。
  - 覆盖后的对象继续经过 `TripPlanSchema.safeParse(...)`，通过后才返回前端。
- 本轮窄修范围：
  - `src/lib/ai/openai-compatible-provider.ts`：归一化 Chat Completions / Responses endpoint；限制输出 token；对瞬时 timeout / 5xx / 429 做有限重试；provider 外层 envelope 非 JSON 时把响应体作为 raw text 交给既有 JSON 解析链路；保留安全诊断日志，仅记录 event、model、protocol、url host、HTTP status 和 attempt。
  - `src/lib/ai/build-trip-plan-prompt.ts`：压缩输出规模，并强化 JSON object、schema、`needVerify`、`disclaimer`、五类 `userVerifyItems` 和 `variableInfoTypes` 枚举约束。
  - `src/lib/services/generate-trip-plan.ts`：继续保持 raw text 先过 `parseAiJson`、最终过 `TripPlanSchema.safeParse`；仅对 `dailyItinerary.items[].variableInfoTypes` 做非法枚举标签过滤，不补全业务字段、不伪造票价/天气/酒店/交通数据；新增脱敏 schema 诊断，只记录 path/code/message。
  - `src/components/trip/result-actions.tsx`：复制全文优先使用剪贴板 API，失败时展示持久 textarea 手动复制兜底。
  - 未修改 `parse-ai-json.ts`，未加入复杂字段猜测补全。
- 已保持当前边界：
  - 未改变 `POST /api/travel-plans/generate`。
  - 未删除或替换 mock provider。
  - 未修改 `.env.local` 或 `.env.local.example`。
  - 未实现数据库、登录、地图、天气、搜索、PDF、版本历史、方案对比或行程优化。

## 第 12 轮验证结果

- 真实 `AI_PROVIDER=openai-compatible` API 验收：
  - 修复后使用生产构建临时服务 `[本地验证 URL]`。
  - 合法 3 天厦门旅行计划请求返回 HTTP 200、`ok: true`。
  - 响应为 `source.provider=openai-compatible`、`source.kind=ai`。
  - `input.days=3`，`dailyItinerary.length=3`。
  - `userVerifyItems` 五类齐全：门票/预约、营业时间、酒店价格、交通班次/价格、天气。
  - 响应摘要检查未发现密钥、Bearer、Authorization、`AI_API_KEY` 或堆栈泄漏特征。
- 真实 AI 页面验收：
  - 修复后使用生产构建临时服务 `[本地验证 URL]` 和 in-app Browser 验证。
  - 首页默认合法表单提交真实 AI 请求后，页面展示真实 AI 计划结果。
  - 页面可见 `OpenAI-compatible`、`AI 草稿`、`复制全文` 和 `下载 Markdown`。
  - `复制全文` 在当前 Codex in-app Browser 中走 textarea 手动复制兜底，显示“已展开 Markdown 全文，可手动复制。”，textarea 可见且有 Markdown 内容。
  - `下载 Markdown` 点击后显示“已开始下载 Markdown 文件。”成功反馈；Codex in-app Browser 不支持下载事件监听，本轮按页面反馈验收下载触发。
- `AI_PROVIDER=mock` 回归：
  - 修复后使用生产构建临时服务 `[本地验证 URL]`。
  - 合法 3 天请求返回 HTTP 200、`ok: true`。
  - 响应为 `source.provider=mock`、`source.kind=mock`。
  - `input.days=3`，`dailyItinerary.length=3`。
  - `userVerifyItems` 覆盖 `ticketReservation`、`openingHours`、`hotelPrice`、`transportSchedulePrice`、`weather` 五类。
- `AI_PROVIDER=openai-compatible` 缺配置错误路径：
  - 修复后使用生产构建临时服务 `[本地验证 URL]`。
  - 临时将 `AI_PROVIDER=openai-compatible` 且必需 provider 配置置空，不修改 `.env.local`。
  - 合法请求返回 HTTP 500、`ok: false`、`error.code=AI_PROVIDER_CONFIG_ERROR`，且包含 `requestId`。
  - 错误响应未出现密钥、Bearer、Authorization、`AI_API_KEY`、完整 URL 或堆栈泄漏特征。
- 本轮继续修复前观察到的问题：
  - 真实 provider 曾出现 `invalid_json_response / chat_completions`、timeout，以及 `variableInfoTypes` 非法枚举导致的 `AI_SCHEMA_VALIDATION_ERROR`。
  - 已通过 provider 有限重试、外层非 JSON raw text 兼容、prompt 枚举约束和 `variableInfoTypes` 非法标签窄过滤收口。
  - 这些修复不改变 API route，不跳过 `parseAiJson`，不跳过 `TripPlanSchema.safeParse`，不伪造业务字段。
- 静态检查结果：
  - `npm run lint` 已通过。
  - `npm run build` 已通过。
  - `npx tsc --noEmit` 已通过。

## 记录时间

- 日期：2026-06-07
- 阶段：MVP 编码阶段第 12 轮

# 项目状态记录 - MVP 编码阶段第 11 轮

## 第 11 轮已完成

- 已重新检查真实 AI Provider 验证前置条件：
  - 当前工作区根目录仍不存在 `.env.local`。
  - 因缺少 `.env.local`，本轮按约定停止真实 `AI_PROVIDER=openai-compatible` 端到端调用验证。
  - 本轮未读取、打印、提交或记录任何真实 `AI_API_KEY`。
- 本轮未发现可基于真实 AI 响应修复的问题：
  - 因未执行真实 provider 调用，未观察到真实 AI 返回的 Markdown 包裹、字段缺失、字段名不一致、`needVerify` 不合格或 `dailyItinerary` 天数不一致问题。
  - 因此未修改 `build-trip-plan-prompt.ts`、`parse-ai-json.ts`、`TripPlanSchema`、`generate-trip-plan` service 或 API route。
- 已保持当前边界：
  - 未改变 `POST /api/travel-plans/generate`。
  - 未删除或替换 mock provider。
  - 未在前端暴露任何密钥。
  - 未实现数据库、登录、地图、天气、联网搜索、PDF、版本历史、保存历史、方案对比或行程优化。
- 本轮修改文件：
  - `docs/08-project-state.md`

## 第 11 轮验证结果

- `.env.local` 检查结果：
  - 当前工作区未提供 `.env.local`。
  - 真实 `AI_PROVIDER=openai-compatible` 成功端到端调用未验证，未假装成功。
- `AI_PROVIDER=mock` API 复验已通过：
  - 使用生产构建临时服务 `[本地验证 URL]`。
  - 合法 `POST /api/travel-plans/generate` 请求返回 HTTP 200、`ok: true`。
  - 成功响应中 `source.provider` 为 `mock`，`source.kind` 为 `mock`。
  - 成功响应中 `data.input.days` 为 5，`dailyItinerary.length` 为 5，`userVerifyItems.length` 为 5。
- `AI_PROVIDER=mock` 浏览器主流程复验已通过：
  - 使用生产构建临时服务 `[本地验证 URL]` 和 in-app Browser 验证。
  - 首页表单可打开，点击“厦门”推荐项后可提交生成。
  - 成功后页面显示“已生成草稿”，并展示“复制全文”和“下载 Markdown”入口。
  - 开发用 JSON 预览中 `source.provider` 为 `mock`，`source.kind` 为 `mock`，`input.days` 为 5，`dailyItinerary.length` 为 5，`userVerifyItems.length` 为 5。
- 静态检查结果：
  - `npm run build` 已在本轮临时服务启动前通过。
  - `npm run lint` 已通过。
  - `npm run build` 已通过。
  - `npx tsc --noEmit` 已通过。

## 记录时间

- 日期：2026-06-06
- 阶段：MVP 编码阶段第 11 轮

## 第 10 轮已完成

- 已复查当前 provider 架构：
  - `AI_PROVIDER=mock` 和 `AI_PROVIDER=openai-compatible` 均保留。
  - `AI_PROVIDER` 缺失时仍默认使用 `mock`。
  - `AI_PROVIDER=openai-compatible` 时仍不会 fallback 到 mock，缺少必要配置会返回 `AI_PROVIDER_CONFIG_ERROR`。
  - `openai-compatible` provider 仅适用于 Chat Completions 兼容格式。
- 已确认真实 provider 的服务端密钥边界：
  - `AI_API_KEY`、`AI_MODEL`、`AI_CHAT_COMPLETIONS_URL` 和 `AI_REQUEST_TIMEOUT_MS` 只在服务端 provider 选择与 adapter 中读取。
  - 前端仍只调用本站 `POST /api/travel-plans/generate`。
  - 未发现 `NEXT_PUBLIC_AI_API_KEY` 或其他 `NEXT_PUBLIC_AI_*` 密钥变量。
  - `.env.local.example` 仍只包含变量名和空值示例，没有真实密钥。
- 本轮未发现可基于真实 AI 响应修复的问题：
  - 当前工作区没有 `.env.local`。
  - 因缺少真实 `AI_API_KEY`、`AI_MODEL` 和 `AI_CHAT_COMPLETIONS_URL`，未执行真实 AI 成功调用。
  - 因未观察到真实 provider 返回的非 JSON、Markdown 包裹 JSON、字段缺失、字段名不匹配、`needVerify` 不合格或 `dailyItinerary` 天数不一致问题，本轮未修改 prompt、JSON 解析、schema 或生成 service。
- 已确认错误响应边界：
  - `AI_PROVIDER_CONFIG_ERROR` 缺配置响应不会暴露密钥、Authorization header、Bearer、完整堆栈或供应商敏感信息。
  - `AI_PROVIDER_ERROR`、`AI_EMPTY_RESPONSE`、`AI_JSON_PARSE_ERROR` 和 `AI_SCHEMA_VALIDATION_ERROR` 的 API route 统一只返回错误码、通用 message 和 `requestId`，不返回底层异常对象、堆栈、完整 prompt 或完整 provider 响应。
- 已保持 mock provider 稳定：
  - `AI_PROVIDER=mock` 合法请求仍返回 HTTP 200、`ok: true`。
  - 返回结果仍包含 `source: { provider: "mock", kind: "mock" }`。
  - `dailyItinerary.length` 仍与 `input.days` 一致。
  - 无头 Edge 真实页面流复验显示：表单、推荐目的地、mock API、完整结果展示、复制全文和下载 Markdown 仍可用。
- 本轮修改文件：
  - `docs/08-project-state.md`
- 当前仍未实现：
  - 真实 AI 成功调用验证
  - 非 Chat Completions 兼容格式的第三方 Provider
  - 用户登录
  - 数据库
  - 地图
  - 天气
  - 联网搜索
  - PDF 导出
  - 版本历史
  - 保存历史或保存到笔记
  - 方案对比
  - 行程优化
  - 真实票价、酒店价格、门票、交通班次、天气等实时数据能力

## 第 10 轮验证结果

- 静态检查已通过：
  - `npm run lint` 已通过。
  - `npm run build` 已通过。
  - `npx tsc --noEmit` 已通过。
- `.env.local` 检查结果：
  - 当前工作区未提供 `.env.local`。
  - 因此本轮未验证真实 `AI_PROVIDER=openai-compatible` 成功端到端调用，也不会假装真实 AI 调用成功。
- `AI_PROVIDER=mock` API 验证已通过：
  - 使用生产构建临时服务 `[本地验证 URL]`。
  - 合法 `POST /api/travel-plans/generate` 请求返回 HTTP 200、`ok: true`。
  - 成功响应中 `data.input.destination` 为“厦门”。
  - 成功响应中 `source.provider` 为 `mock`，`source.kind` 为 `mock`。
  - 成功响应中 `data.input.days` 为 5，`dailyItinerary.length` 为 5，`userVerifyItems.length` 为 5。
- `AI_PROVIDER=openai-compatible` 缺配置错误路径验证已通过：
  - 使用生产构建临时服务 `[本地验证 URL]`。
  - 未配置 `AI_API_KEY`、`AI_MODEL`、`AI_CHAT_COMPLETIONS_URL` 时，合法业务请求返回 HTTP 500。
  - 错误响应为 `{ ok: false, error: { code: "AI_PROVIDER_CONFIG_ERROR", message, requestId } }`。
  - 错误响应未暴露 API Key、Authorization header、Bearer、堆栈、`AI_CHAT_COMPLETIONS_URL` 或供应商敏感信息。
- 浏览器主流程验证已通过：
  - 使用 mock 模式生产构建临时服务 `[本地验证 URL]` 和无头 Edge 验证。
  - 首页表单和 4 个目的地推荐项可见。
  - 点击推荐目的地后，`destination` 从“成都”回填为“厦门”。
  - 提交表单后，浏览器实际请求 `POST /api/travel-plans/generate`，网络响应为 HTTP 200、`application/json`。
  - 结果页开发 JSON 预览中的 `source` 为 `{ provider: "mock", kind: "mock" }`。
  - 结果页 `input.destination` 为“厦门”，`input.days` 为 5，`dailyItinerary.length` 为 5，`userVerifyItems.length` 为 5。
  - 结果页展示完整结果操作区，包含“复制全文”和“下载 Markdown”两个按钮。
  - 点击“复制全文”后显示“已复制 Markdown 全文。”。
  - 点击“下载 Markdown”后显示“已开始下载 Markdown 文件。”；本轮验证了浏览器反馈和下载触发，未打开落盘后的 `.md` 文件。

## 记录时间

- 日期：2026-06-06
- 阶段：MVP 编码阶段第 10 轮

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
  - 使用生产构建临时服务 `[本地验证 URL]`。
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
  - 使用生产构建临时服务 `[本地验证 URL]`。
  - 未配置 `AI_API_KEY`、`AI_MODEL`、`AI_CHAT_COMPLETIONS_URL` 时，合法业务请求返回 HTTP 500。
  - 错误响应为 `{ ok: false, error: { code: "AI_PROVIDER_CONFIG_ERROR", message, requestId } }`。
  - 错误响应未暴露 API Key、Authorization header、Bearer、堆栈等敏感文本。
- 浏览器主流程验证已通过：
  - 使用生产构建临时服务 `[本地验证 URL]`。
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
  - 使用生产构建临时服务 `[本地验证 URL]`。
  - 合法 `POST /api/travel-plans/generate` 返回 HTTP 200、`ok: true`。
  - 成功响应中 `data.input.days` 为 5，`dailyItinerary.length` 为 5。
  - 成功响应中 `userVerifyItems.length` 为 5。
  - 成功响应中 `generationMode` 为 `quick`。
- `AI_PROVIDER=openai-compatible` 缺配置错误验证已通过：
  - 使用生产构建临时服务 `[本地验证 URL]`。
  - 未配置 `AI_API_KEY`、`AI_MODEL`、`AI_CHAT_COMPLETIONS_URL` 时，合法业务请求返回 HTTP 500。
  - 错误响应为 `{ ok: false, error: { code: "AI_PROVIDER_CONFIG_ERROR", message, requestId } }`。
  - 错误响应未暴露 API Key、堆栈或供应商敏感信息。
- 浏览器主流程验证已通过：
  - 使用生产构建临时服务 `[本地验证 URL]`。
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
  - 浏览器验证已完成主要流程：`[本地验证 URL]` 首页可打开，表单可提交，目的地推荐可回填，成功后展示完整结果、mock 免责声明、用户自行确认事项、“需确认/估算参考”提示、“复制全文”和“下载 Markdown”按钮。
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
    - 使用本地服务 `[本地验证 URL]` 验证 `POST /api/travel-plans/generate`。
    - 合法请求返回 HTTP 200、`ok: true`。
    - 成功响应包含非空 `data.disclaimer`。
    - 成功响应包含 5 条 `data.userVerifyItems`。
    - 非法请求返回 HTTP 400、`ok: false`、`error.code` 为 `BAD_REQUEST`。
  - 浏览器主流程验证已完成：
    - 本轮优先尝试 `[本地验证 URL]`，但当前项目已有 dev server 在 `[本地验证 URL]`，实际使用 `[本地验证 URL]` 完成验证。
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
    - 使用生产构建临时端口 `[本地验证 URL]` 验证默认表单提交。
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
    - 使用生产构建临时端口 `[本地验证 URL]` 验证默认表单提交。
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
    - 修复后使用生产构建临时端口 `[本地验证 URL]` 复验：当前标签未出现本地验证地址 hydration mismatch，推荐项可回填，mock 生成流程可成功显示基础预览。
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

当前建议以第 15 轮部署验收状态为准：本地生产模式、mock 路径、缺配置错误路径和真实 `AI_PROVIDER=openai-compatible` 路径均已通过验收；Docker Compose 配置和部署脚本已补齐，但本机 Docker daemon 未启动，容器运行级验证仍需在云服务器或可用 Docker 环境中执行。下一步是在目标云服务器配置服务端环境变量，执行 `scripts/deploy-docker-compose.sh` 或 README 中的一行部署命令，记录部署 URL，并按 `docs/09-release-checklist.md` 对部署 URL 执行 smoke test。后续仍需保持服务端读取密钥、前端不暴露密钥、保留 mock provider 边界、继续使用 `POST /api/travel-plans/generate`，并继续后置数据库、登录、地图、天气、搜索增强、PDF 导出、版本历史、方案对比和行程优化。
