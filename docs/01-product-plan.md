# AI 旅行计划生成与管理网站 - 产品规划

> **状态说明（第 49 轮）**：本文是历史设计/早期 MVP 参考，保留用于追溯旧规划，不再作为当前执行依据。当前事实以 `docs/00-project-brief-and-roadmap.md`、`docs/08-project-state.md`、`docs/13-next-feature-roadmap.md`、`docs/14-delete-restore-design.md` 和当前代码为准。

## 关键假设

- 当前仓库没有既有业务代码，按新项目规划，后续使用 Next.js App Router、TypeScript、Tailwind CSS。
- MVP 只完成旅行计划生成闭环，不做用户登录、数据库、历史记录、票务预订或实时数据查询。
- 前端只调用本站后端接口 `POST /api/travel-plans/generate`，不直接调用第三方 AI API。
- 所有实时或易变化信息必须标记为参考信息，使用 `needVerify: true` 或放入 `verificationItems`。
- AI 生成结果的核心类型统一为 `TripPlan`，请求类型为 `TripGenerationRequest`，响应类型为 `TripGenerationResponse`。

## 产品定位

本项目是一个 AI 旅行计划生成与管理网站，核心价值是帮助用户快速生成可编辑、可复制、可下载的旅行计划草稿。

项目不是专业票务平台、酒店平台、地图平台、实时路线平台或天气平台。第一版不承诺门票、营业时间、酒店价格、交通班次、天气、预约状态、交通耗时等信息的实时准确性。所有此类内容必须明确提示用户出发前自行确认。

## 目标用户

- 准备旅行但还没有完整计划的普通用户。
- 希望快速获得行程草稿，再自行调整细节的用户。
- 想基于目的地、日期、人数、预算、偏好快速得到每日安排的人。
- 对实时票价、实时酒店库存、真实交通耗时没有强依赖，只需要规划参考的人。

## MVP 范围

MVP 必须完成以下闭环：

1. 用户填写旅行信息。
2. 前端提交 `TripGenerationRequest` 到 `POST /api/travel-plans/generate`。
3. 后端通过 AI Provider 抽象层调用 AI。
4. AI 返回结构化 JSON。
5. 后端解析 JSON 并用 Zod schema 校验。
6. 后端返回 `TripGenerationResponse`。
7. 前端展示 `TripPlan`。
8. 用户可以重新生成、复制全文、下载 Markdown。

MVP 表单输入：

- `departureCity`: 出发城市。
- `destination`: 目的地。
- `startDate`: 出发日期，ISO 日期字符串，如 `2026-07-01`。
- `endDate`: 返回日期，ISO 日期字符串，如 `2026-07-05`。
- `travelers`: 人数。
- `budget.amount`: 总预算金额。
- `budget.currency`: 固定为 `CNY`。
- `preferences`: 旅行偏好数组。
- `travelStyle`: 旅行风格，取值为 `relaxed`、`balanced`、`intensive`、`family`、`food`、`culture`、`nature`。
- `specialRequests`: 可选补充要求。

MVP 生成结果至少包含：

- 旅行总览。
- 出发城市、目的地、出发日期、返回日期、天数、人数、预算、旅行风格。
- 每日行程。
- 景区安排。
- 餐饮建议。
- 住宿建议。
- 交通方案。
- 预算拆分。
- 准备清单。
- 风险提醒。
- 用户自行确认事项。
- 免责声明。

## 非 MVP 范围

第一版明确不做：

- 用户登录、注册、账号体系。
- 数据库、历史记录、版本回滚。
- 服务端 PDF 导出或精确排版 PDF；MVP 仅支持浏览器打印/保存 PDF。
- 真实酒店价格、真实门票价格、票务预订。
- 复杂地图展示、实时路线规划。
- 实时天气。
- 真实联网搜索。
- 多 AI Provider 切换 UI。
- 团队协作、分享链接、评论。

这些能力不得作为 MVP 阻塞项，也不要在第一版实现时预留复杂数据库结构。

## 后续扩展

后续可以按阶段扩展：

- 网络参考增强模式：引入搜索 API 获取参考资料，但需要查官方文档确认接口能力、价格、额度和合规要求。
- 地图和路线 API：用于辅助展示路线，不作为 MVP 计划生成的必要依赖。
- 天气 API：展示未来天气提醒，必须标记为实时参考。
- 方案对比：同一输入生成多个方案并比较。
- AI 评分和行程优化：对计划节奏、预算、风险做评分。
- 旅行文案：生成朋友圈、小红书、备忘录风格文案。
- 保存历史和版本回滚：引入用户系统和数据库后再做。
- 多 AI Provider：在已有 `AIProvider` 接口基础上扩展。

## 核心用户流程

1. 用户进入首页，直接看到旅行计划生成工具。
2. 用户填写出发城市、目的地、日期、人数、预算、旅行风格、偏好。
3. 用户也可以从随机推荐目的地中选择一个目的地填入表单。
4. 用户点击生成按钮。
5. 页面进入生成中状态，按钮禁用，展示加载提示。
6. 后端生成并校验 `TripPlan`。
7. 页面展示旅行总览、每日行程、餐饮住宿交通建议、预算拆分、准备清单、风险提醒、自行确认事项和免责声明。
8. 用户可以点击重新生成，使用同一份输入再次请求 `POST /api/travel-plans/generate`。
9. 用户可以复制全文。
10. 用户可以下载 Markdown 文件。

## 成功验收标准

- 用户能在无登录状态下完成一次旅行计划生成。
- `POST /api/travel-plans/generate` 能接收合法 `TripGenerationRequest` 并返回合法 `TripGenerationResponse`。
- `TripPlan` 覆盖所有 MVP 必填内容。
- 前端展示不依赖数据库和真实第三方实时数据。
- AI 返回内容必须经过 JSON 解析和 Zod schema 校验。
- AI 返回格式错误时，后端有明确错误提示或有限重试策略。
- 所有易变化信息都被标记为 `needVerify: true`，或进入 `verificationItems`。
- 页面提供重新生成、复制全文、下载 Markdown。
- 前端代码和浏览器网络请求中不暴露 `AI_API_KEY`。
