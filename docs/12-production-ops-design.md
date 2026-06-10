# Production Operations Design

本文档用于第 35 轮生产化基础设施方案设计。目标是把当前测试版推进到更稳定的生产部署形态，但本轮只写方案与清单，不直接修改服务器、不执行真实生产迁移、不改变业务功能或 API 行为。

## 1. 当前部署现状

- 当前阶段是测试版，最近一次完整验收使用 `[测试版访问地址]` 作为测试版访问入口记录，不在文档中保存真实访问地址。
- 当前仓库已有 Dockerfile 与 Docker Compose 配置，现有 `docker-compose.yml` 只定义 Next.js app 容器，数据库通过服务端环境变量连接外部 `[数据库服务]`。
- 真实数据库、真实 Auth、`[真实 AI Provider]` 路径已经在测试版验收中通过；验收记录只描述能力状态，不记录真实域名、IP、连接串、OAuth secret、AI key、session token 或 provider endpoint。
- 当前已有发布检查清单、数据库迁移脚本、数据库摘要脚本、API smoke test 脚本与 Docker Compose 部署脚本；第 35 轮不修改这些脚本。

## 2. 目标生产架构

生产部署建议采用“公网入口 + 反向代理 + Next.js app 容器 + PostgreSQL 数据库服务”的最小稳定形态。

| 层级 | 目标设计 | 说明 |
| --- | --- | --- |
| 域名 | `[生产域名]` | 生产环境唯一公开访问入口；测试环境继续使用 `[测试版访问地址]`。 |
| HTTPS | 反向代理终止 TLS | 证书自动续期；HTTP 请求统一跳转到 HTTPS。 |
| 反向代理 | 代理到 Next.js app | 负责 TLS、压缩、基础请求头、超时、访问日志与静态防护策略。 |
| Docker Compose | 管理 app 服务 | 当前最小生产单元是 `traceme-next` app 容器；如将反向代理纳入 Compose，应作为独立服务管理。 |
| Next.js app | 生产构建运行 | 只通过服务端环境变量读取 Auth、DB、AI 配置；不在前端暴露密钥。 |
| PostgreSQL | `[数据库服务]` | 推荐独立托管或独立运维；备份、恢复、监控和访问控制独立于 app 容器。 |

原则：

- app 容器不直接暴露给公网，只接受反向代理转发。
- PostgreSQL 不暴露给公网，只允许 app 运行环境和受控运维入口访问。
- 生产、测试、本地环境使用独立数据库、独立 Auth 回调配置和独立 AI 配额。
- 第 35 轮不新增管理后台、不新增支付、不新增地图/天气/搜索能力。

## 3. 环境变量分层

环境变量按环境分层管理，文档只记录变量名和用途，不记录真实值。

| 环境 | 存放位置 | 用途 | 约束 |
| --- | --- | --- | --- |
| 本地开发 | 本机忽略文件或本地 shell | mock 开发、单元测试、可选本地数据库验证 | 不使用生产密钥，不提交 `.env` 或 `.env.local`。 |
| 测试部署 | 测试服务器服务端环境或测试 secret store | 连接测试 `[数据库服务]`、测试 Auth、测试 `[真实 AI Provider]` | 访问入口记为 `[测试版访问地址]`，不复用生产数据库。 |
| 生产部署 | 生产服务器服务端环境或生产 secret store | 连接生产 `[数据库服务]`、生产 Auth、生产 `[真实 AI Provider]` | 访问入口记为 `[生产域名]`，只在生产运行环境中可读。 |

需要分层管理的变量类别：

- AI：`AI_PROVIDER`、`AI_API_KEY`、`AI_MODEL`、`AI_CHAT_COMPLETIONS_URL`、`AI_REQUEST_TIMEOUT_MS`
- 数据库：`DATABASE_URL`
- Auth：`AUTH_SECRET`、`AUTH_URL`、`AUTH_GITHUB_ID`、`AUTH_GITHUB_SECRET`
- 部署：`APP_PORT` 以及部署脚本自身使用的非业务变量

环境变量规则：

- 本地、测试、生产三套值必须分离。
- 生产 `AUTH_URL` 必须对应 `[生产域名]`；测试 `AUTH_URL` 必须对应 `[测试版访问地址]`。
- 生产数据库连接只指向生产 `[数据库服务]`；测试迁移和验收只指向测试数据库。
- 不新增 `NEXT_PUBLIC_*` 密钥变量；浏览器端不得读取 AI、Auth、DB 密钥。

## 4. 密钥管理

密钥管理目标是减少泄露面，并让泄露或人员变更时可以快速轮换。

- 密钥不进 git：不得提交 `.env`、`.env.local`、连接串、OAuth secret、AI key、session token、bearer token 或 authorization header 值。
- 密钥不进文档：文档、Issue、截图、日志、测试输出和发布记录只写变量名或占位符。
- 密钥只放服务端：生产环境通过服务器环境、部署平台 secret store 或受控 `.env` 文件注入；文件权限限制为运行用户可读。
- 密钥按环境隔离：本地、测试、生产不共用 AI key、OAuth app、Auth secret 或数据库用户。

轮换策略：

- 立即轮换：任何疑似泄露、人员离开、服务商控制台异常、日志误打密钥、服务器迁移或备份泄露。
- 定期轮换：AI key、OAuth secret、数据库密码建议至少每 90 天检查一次；高风险密钥可按更短周期轮换。
- `AUTH_SECRET` 轮换会影响会话有效性，应安排维护窗口，并提前接受用户重新登录。
- 轮换后必须执行 smoke test，并确认旧密钥已经停用且不再出现在服务器环境、日志、备份或部署脚本中。

## 5. 数据库备份与恢复

生产数据库备份覆盖 `users`、Auth session 表、保存的旅行计划、版本历史、分享链接哈希和迁移账本。

备份策略：

- 自动备份：每天至少一次完整备份。
- 发布前备份：任何生产数据库迁移前先创建一次可恢复备份。
- 保留周期：建议保留最近 7 天每日备份、最近 4 周每周备份、最近 3 个月每月备份。
- 备份加密：备份文件必须加密存放，密钥与备份文件分离管理。
- 存放位置：备份放在独立备份存储，不放在应用仓库、app 容器层、公开目录或单一服务器本地路径中。

恢复演练：

- 每月至少一次恢复演练，恢复到隔离的测试数据库。
- 恢复演练只验证结构、迁移账本、关键表数量和应用只读 smoke test，不导出敏感明细到日志。
- 记录演练结果：备份时间、恢复耗时、迁移版本、验证命令是否通过、是否发现敏感输出。
- 生产事故恢复前，先确认恢复点、影响范围和是否会丢失用户在恢复点之后创建的数据。

## 6. 数据库迁移流程

数据库迁移必须先测试库，再生产库。

发布前：

- 确认迁移文件已经进入代码审查，并且不会修改既有迁移文件 checksum。
- 在测试环境连接测试 `[数据库服务]` 执行迁移。
- 在测试环境运行 `npm run db:migrate`、`npm run auth:db-summary` 和 API smoke test，输出只能包含安全摘要。
- 确认测试库迁移后 generate、compare、save、history、versions、share API 行为未改变。

生产执行：

- 锁定生产发布窗口，记录待发布 commit 或镜像标签。
- 创建生产数据库发布前备份。
- 确认 app 当前版本和目标版本。
- 对生产 `[数据库服务]` 执行迁移。
- 迁移完成后启动或滚动更新 app，并执行 smoke test。

失败处理：

- 如果迁移在测试库失败，不进入生产。
- 如果生产迁移前置检查失败，停止发布并保持旧版本运行。
- 如果生产迁移执行失败，停止发布，保留错误摘要，避免重复执行不确定状态的迁移。
- 如果数据库结构或数据已经不兼容旧 app，按备份恢复预案处理；恢复前必须确认会丢失的数据窗口。
- 任何破坏性迁移都必须在进入生产前准备单独回滚方案和恢复演练记录。

## 7. 日志策略

日志目标是支持排障和监控，同时避免记录敏感内容。

禁止记录：

- prompt 全文、用户完整输入、完整 AI 原始响应、完整 `TripPlan` snapshot。
- `AI_API_KEY`、OAuth secret、`AUTH_SECRET`、`DATABASE_URL`、session token、provider token、bearer token、authorization header、raw share token、token hash。
- 完整 provider endpoint、数据库 SQL 明细、堆栈 trace、连接串、cookie、用户邮箱明文。

错误摘要允许记录：

- `requestId`
- 时间戳
- 环境标签：local、test、production
- route 或 operation 名称
- HTTP method 与 status
- 业务错误码，例如 `BAD_REQUEST`、`UNAUTHORIZED`、`NOT_FOUND`、`AI_PROVIDER_CONFIG_ERROR`、`INTERNAL_ERROR`
- error name 或安全错误类别
- provider kind：mock 或 ai，不记录真实 provider endpoint 或 key
- duration、retry attempt、response size bucket
- schema validation 的 issue code、path、message 摘要，最多保留有限条数
- 数据库操作类别，例如 read、insert、update、migration，不记录 SQL 和参数

日志保留：

- 生产应用日志按时间滚动，避免占满磁盘。
- 访问日志和错误日志分离，便于设置不同保留周期。
- 对外展示错误只返回固定错误码、固定文案和 `requestId`，不返回内部错误细节。

## 8. 监控策略

生产监控先覆盖基础可用性和关键依赖。

基础检查：

- 首页健康检查：定时请求 `https://[生产域名]/`，期望 HTTP 200 且包含应用信号文本。
- API smoke test：定时或发布后调用旅行计划生成 smoke test，使用非敏感样例请求；测试 AI 模式时只记录安全摘要。
- 容器状态：检查 app 容器是否 running、是否频繁重启、最近启动时间是否异常。
- 磁盘空间：监控服务器磁盘、日志目录、Docker 镜像层和备份临时目录。
- 数据库连接：对 `[数据库服务]` 做最小连接探测或安全只读查询，不输出连接串和查询结果明细。

告警建议：

- 首页连续失败 3 次告警。
- API smoke test 连续失败 2 次告警。
- app 容器重启次数异常告警。
- 磁盘使用率超过 80% 预警，超过 90% 告警。
- 数据库连接失败、连接池耗尽或迁移账本异常告警。
- AI provider 连续失败率异常告警，但日志只记录安全 provider kind 和错误类别。

## 9. 回滚预案

回滚分为应用回滚和数据库恢复两类。

应用回滚：

- 保留上一个可用 commit 或镜像标签。
- 如果新版本启动失败或 smoke test 失败，回退到上一个 app 镜像/commit。
- 回滚后重新执行首页健康检查、API smoke test、登录检查和关键历史/分享只读路径检查。
- 观察日志中是否出现重复错误、数据库不兼容或 Auth 回调异常。

停止服务：

- 当数据库迁移、数据一致性或密钥泄露风险无法立即判断时，优先停止写入路径或停止 app 服务，避免扩大影响。
- 停止服务期间保留反向代理层的固定维护响应，不暴露内部错误。

数据库恢复：

- 只有在数据损坏、破坏性迁移失败或 app 回滚无法兼容数据库时执行恢复。
- 从发布前加密备份恢复到隔离环境验证，再恢复生产 `[数据库服务]`。
- 恢复后运行迁移账本检查、关键表存在性检查、登录检查和 API smoke test。
- 恢复操作必须记录恢复点、影响窗口、验证结果和是否需要通知用户。

## 10. 发布流程

生产发布按以下顺序执行：

1. 发布准备
   - 确认目标 commit 或镜像标签。
   - 确认本地或 CI 中 `npm test`、`npm run lint`、`npm run build`、`npx tsc --noEmit` 全部通过。
   - 确认文档和日志没有真实域名、IP、连接串、密钥或 token。
2. 构建
   - 构建生产镜像或生产构建产物。
   - 记录镜像标签或 commit，不记录密钥值。
3. 测试库迁移
   - 连接测试 `[数据库服务]` 运行迁移。
   - 对 `[测试版访问地址]` 执行 smoke test。
4. 生产备份与迁移
   - 创建生产 `[数据库服务]` 发布前备份。
   - 运行生产迁移。
5. 启动
   - 启动或更新 app 容器。
   - 确认反向代理转发到新 app 实例。
6. Smoke test
   - 检查 `https://[生产域名]/`。
   - 检查 generate、compare、save、history、versions、share 关键路径的安全 smoke test。
   - 确认响应和日志不暴露敏感值。
7. 观察期
   - 观察 30 到 60 分钟。
   - 关注错误率、容器重启、数据库连接、磁盘空间、AI provider 错误类别。
   - 如果异常无法快速定位，按回滚预案执行。

## 11. 当前不做项

第 35 轮明确不做：

- 管理后台
- 支付
- 地图
- 天气
- 搜索
- 业务功能变更
- generate / compare / save / history / versions / share API 行为变更
- 真实服务器修改
- 真实生产迁移
- `.env` 或 `.env.local` 提交
