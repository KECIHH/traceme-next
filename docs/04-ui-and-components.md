# AI 旅行计划生成与管理网站 - UI 与组件设计

## 关键假设

- 首页 `src/app/page.tsx` 就是核心工具页面，不做营销落地页。
- UI 使用 Tailwind CSS，组件保持简洁、可扫描、适合重复使用。
- 前端只调用 `POST /api/trips/generate`，不直接调用第三方 AI API。
- 结果展示的数据源为 `TripGenerationResponse.tripPlan`。
- Markdown 复制和下载使用 `tripToMarkdown(tripPlan)`。

## MVP 范围

MVP 页面包含：

- 顶部应用标题和简短定位说明。
- 旅行信息表单。
- 随机目的地推荐。
- 生成按钮和生成中状态。
- 错误提示。
- 旅行计划结果展示。
- 重新生成按钮。
- 复制全文按钮。
- 下载 Markdown 按钮。
- 风险提醒、自行确认事项、免责声明。

## 非 MVP 范围

第一版不做：

- 登录入口、用户头像、个人中心。
- 历史列表、保存按钮、版本回滚。
- 地图组件。
- 酒店卡片价格对比。
- 门票预订入口。
- PDF 下载。
- 多方案横向对比。
- 复杂动画和营销型 hero。

## 后续扩展

后续可以增加：

- 历史行程侧边栏。
- 多方案 tabs。
- 地图预览。
- AI 评分面板。
- 网络参考来源列表。
- 天气提醒卡片。
- 分享链接。

## 页面布局

`src/app/page.tsx` 采用单页工作台布局：

```txt
Page
  Header
  Main two-column layout on desktop
    Left: TripForm + DestinationSuggestions
    Right: TripPlanView or EmptyState
  Footer note / disclaimer short text
```

移动端使用单列布局：

```txt
Header
TripForm
DestinationSuggestions
Loading / Error / TripPlanView
MarkdownActions
```

首页要直接展示工具本体，不使用大幅营销页、轮播或单纯产品介绍。

## 组件设计

### `TripForm`

职责：

- 维护表单状态。
- 输出 `TripGenerationRequest`。
- 做基础前端校验。
- 提交时调用父组件的 `onSubmit(request)`。

字段：

- `departureCity`
- `destination`
- `startDate`
- `endDate`
- `travelers`
- `budget.amount`
- `budget.currency` 固定为 `CNY`
- `preferences`
- `travelStyle`
- `specialRequests`

交互：

- 日期结束早于开始时给出提示。
- 人数和预算使用数字输入。
- `travelStyle` 使用单选或 segmented control。
- `preferences` 使用 checkbox 或 tag toggle。
- 提交中禁用按钮。

### `DestinationSuggestions`

可以放在 `TripForm` 内或同级组件中。

职责：

- 使用前端本地静态数组展示随机目的地或景点。
- 用户点击后填入 `destination`。
- 不调用搜索 API。

示例数据字段：

```ts
interface DestinationSuggestion {
  name: string;
  tags: string[];
  shortReason: string;
}
```

### `TripPlanView`

职责：

- 接收 `tripPlan: TripPlan`。
- 展示旅行总览、基本信息、每日行程、景点、餐饮、住宿、交通、预算、准备清单、风险提醒、自行确认事项、免责声明。
- 对有 `needVerify: true` 的条目展示 `VerifyBadge`。

建议分区：

- OverviewSection
- DailyItinerarySection
- AttractionsSection
- DiningSection
- AccommodationSection
- TransportationSection
- BudgetSection
- PackingListSection
- RiskAndVerificationSection
- DisclaimerSection

这些分区可以先写在 `TripPlanView` 内，只有代码变复杂时再拆成独立组件。

### `DayPlanCard`

职责：

- 展示单日 `DayPlan`。
- 按 `timeOfDay` 展示 `ItineraryItem`。
- 对 `needVerify` 条目显示 `VerifyBadge` 和 `verifyNote`。

### `VerifyBadge`

职责：

- 展示“需自行确认”或同义短标签。
- 用于门票、营业时间、酒店价格、交通班次、天气、预约状态、交通耗时等易变化内容。
- 不做复杂逻辑，只根据 `needVerify` 决定是否显示。

### `MarkdownActions`

职责：

- 接收 `tripPlan: TripPlan`。
- 调用 `tripToMarkdown(tripPlan)`。
- 提供复制全文。
- 提供下载 Markdown。
- 操作成功后显示短反馈。

## 页面状态

使用本地 React state 即可：

```ts
type GenerateStatus = "idle" | "loading" | "success" | "error";
```

页面状态：

- `request`: 最近一次 `TripGenerationRequest`，用于重新生成。
- `tripPlan`: 当前 `TripPlan | null`。
- `warnings`: 当前 `string[]`。
- `status`: `GenerateStatus`。
- `errorMessage`: 当前错误文案。

交互规则：

- 首次进入页面时 `status = "idle"`，右侧展示空状态。
- 点击生成后 `status = "loading"`。
- 成功后 `status = "success"` 并展示 `TripPlanView`。
- 失败后 `status = "error"`，保留用户表单输入。
- 重新生成使用最近一次表单输入再次调用 `POST /api/trips/generate`。

## 错误文案

错误提示面向用户，不暴露堆栈：

- 输入错误：`请检查出发地、目的地、日期、人数和预算是否填写正确。`
- AI 格式错误：`AI 返回的计划格式不稳定，请稍后重试。`
- 服务配置错误：`服务暂时不可用，请稍后再试。`
- 未知错误：`生成失败，请稍后重试。`

开发模式下可以在控制台输出详细错误，但不要展示给普通用户。

## Markdown 下载

下载文件名建议：

```txt
trip-plan-{destination}-{startDate}.md
```

需要处理目的地中的空格和特殊字符，最简单做法是替换为空格或短横线。MVP 不需要服务端存储生成文件。

## UI 验收标准

- 首页第一屏即可看到表单和生成入口。
- 表单字段能组成合法 `TripGenerationRequest`。
- 生成中状态清晰，重复提交被禁用。
- 错误状态能恢复，用户不需要重新填写表单。
- 结果页完整展示 `TripPlan` 的所有 MVP 信息。
- `needVerify: true` 条目有明显提示。
- 复制全文和下载 Markdown 能使用同一份 `TripPlan`。
- 移动端无明显文字溢出或布局重叠。

